"""Minimal Compound File Binary (CFB / OLE2) writer per [MS-CFB].

Supports storages + streams with MiniFAT for small streams. Sector size 512.
"""
import struct

SECTOR = 512
MINISECTOR = 64
MINI_CUTOFF = 4096
FREESECT = 0xFFFFFFFF
ENDOFCHAIN = 0xFFFFFFFE
FATSECT = 0xFFFFFFFD
DIFSECT = 0xFFFFFFFC
NOSTREAM = 0xFFFFFFFF


class Entry:
    def __init__(self, name, is_storage):
        self.name = name
        self.is_storage = is_storage
        self.data = b'' if not is_storage else None
        self.children = []          # for storages
        self.left = NOSTREAM
        self.right = NOSTREAM
        self.child = NOSTREAM
        self.start_sector = ENDOFCHAIN
        self.size = 0
        self.id = None


def _pad(data, size, fill=b'\x00'):
    if len(data) % size:
        data += fill * (size - (len(data) % size))
    return data


def _build_red_black(children_ids, entries):
    """Build a simple (unbalanced-but-valid) BST ordered by CFB name key.
    Excel tolerates unbalanced trees; we sort and build a balanced BST."""
    # CFB sort: by name length, then uppercase name
    def key(eid):
        n = entries[eid].name
        return (len(n), n.upper())
    ids = sorted(children_ids, key=key)

    def build(lo, hi):
        if lo > hi:
            return NOSTREAM
        mid = (lo + hi) // 2
        node = ids[mid]
        entries[node].left = build(lo, mid - 1)
        entries[node].right = build(mid + 1, hi)
        return node
    return build(0, len(ids) - 1)


def write_cfb(root_children):
    """root_children: list of Entry (top-level, under Root Entry)."""
    entries = []

    root = Entry('Root Entry', True)
    root.children = root_children

    # Flatten all entries, assign IDs (root first)
    def collect(e):
        e.id = len(entries)
        entries.append(e)
        for c in e.children if e.is_storage else []:
            collect(c)
    collect(root)

    # Build directory trees (child pointers)
    for e in entries:
        if e.is_storage and e.children:
            child_ids = [c.id for c in e.children]
            e.child = _build_red_black(child_ids, entries)

    # --- Assemble mini stream (small streams) ---
    mini_stream = bytearray()
    minifat = []  # list of next-minisector or ENDOFCHAIN
    for e in entries:
        if e.is_storage:
            continue
        e.size = len(e.data)
        if e.size < MINI_CUTOFF and e.size > 0:
            start = len(mini_stream) // MINISECTOR
            padded = _pad(e.data, MINISECTOR)
            nsec = len(padded) // MINISECTOR
            for i in range(nsec):
                minifat.append(ENDOFCHAIN if i == nsec - 1 else (start + i + 1))
            mini_stream += padded
            e.start_sector = start
        elif e.size == 0:
            e.start_sector = ENDOFCHAIN

    mini_stream = bytes(mini_stream)

    # --- Big sectors: we lay out regular streams (>=cutoff), mini stream,
    # then MiniFAT, then directory, then FAT. Assign sequentially. ---
    big_chunks = []  # list of (entry_or_tag, bytes)

    # regular (big) streams
    for e in entries:
        if e.is_storage or e.size == 0:
            continue
        if e.size >= MINI_CUTOFF:
            big_chunks.append((e, _pad(e.data, SECTOR)))

    # mini stream data goes into root entry's big-sector chain
    if mini_stream:
        big_chunks.append((root, _pad(mini_stream, SECTOR)))
        root.size = len(mini_stream)
    else:
        root.size = 0
        root.start_sector = ENDOFCHAIN

    # MiniFAT sectors
    minifat_start = ENDOFCHAIN
    num_minifat_sectors = 0
    ENTRIES_PER_SECTOR = SECTOR // 4
    if minifat:
        while len(minifat) % ENTRIES_PER_SECTOR:
            minifat.append(FREESECT)
        minifat_bytes = b''.join(struct.pack('<I', v) for v in minifat)
        num_minifat_sectors = len(minifat_bytes) // SECTOR
    else:
        minifat_bytes = b''

    # --- Now assign big sector numbers ---
    # Order in file (after header): big stream chunks, mini stream, minifat,
    # directory, FAT.
    layout = []  # (name, bytes, chain_owner)
    sector_no = 0

    def assign(chunk_bytes):
        nonlocal sector_no
        nsec = len(chunk_bytes) // SECTOR
        start = sector_no
        sector_no += nsec
        return start, nsec

    fat = []  # per-sector next pointer

    def chain(start, nsec):
        for i in range(nsec):
            fat.append(ENDOFCHAIN if i == nsec - 1 else start + i + 1)

    body = bytearray()

    # big stream chunks (including root mini-stream container)
    for owner, cb in big_chunks:
        start, nsec = assign(cb)
        owner.start_sector = start
        chain(start, nsec)
        body += cb

    # minifat
    if num_minifat_sectors:
        start, nsec = assign(minifat_bytes)
        minifat_start = start
        chain(start, nsec)
        body += minifat_bytes

    # Directory entries (128 bytes each) — built AFTER start_sectors assigned
    dir_bytes = bytearray()
    for e in entries:
        name_utf16 = e.name.encode('utf-16-le')
        name_len = len(name_utf16) + 2  # incl terminating null
        nb = name_utf16 + b'\x00' * (64 - len(name_utf16))
        if e is root:
            obj_type = 5  # root storage
        elif e.is_storage:
            obj_type = 1  # storage
        else:
            obj_type = 2  # stream
        color = 1  # black
        clsid = b'\x00' * 16
        entry = struct.pack('<64sHBBIII16sIQQIQ',
                            nb, name_len, obj_type, color,
                            e.left, e.right, e.child,
                            clsid, 0, 0, 0,
                            e.start_sector & 0xFFFFFFFF,
                            e.size)
        assert len(entry) == 128, len(entry)
        dir_bytes += entry
    dir_bytes = _pad(dir_bytes, SECTOR)

    # directory
    dir_start, dir_nsec = assign(dir_bytes)
    chain(dir_start, dir_nsec)
    body += dir_bytes

    # --- FAT: need enough sectors to describe all sectors including FAT itself ---
    # iterate to fixpoint
    num_fat_sectors = 1
    while True:
        total_sectors = sector_no + num_fat_sectors
        needed = (total_sectors * 4 + SECTOR - 1) // SECTOR
        if needed == num_fat_sectors:
            break
        num_fat_sectors = needed

    fat_start = sector_no
    for i in range(num_fat_sectors):
        fat.append(FATSECT)
    # ensure fat list covers all sectors up to fat_start+num_fat_sectors
    while len(fat) < fat_start + num_fat_sectors:
        fat.append(FREESECT)
    # pad to sector boundary
    while len(fat) % ENTRIES_PER_SECTOR:
        fat.append(FREESECT)
    fat_bytes = b''.join(struct.pack('<I', v) for v in fat)

    # DIFAT: first 109 entries in header
    difat = [fat_start + i for i in range(num_fat_sectors)]
    header_difat = difat[:109] + [FREESECT] * (109 - len(difat[:109]))
    assert len(difat) <= 109, "too many FAT sectors for header DIFAT"

    # --- Header ---
    header = bytearray()
    header += b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1'  # signature
    header += b'\x00' * 16                          # CLSID
    header += struct.pack('<H', 0x003E)             # minor version
    header += struct.pack('<H', 0x0003)             # major version (3 => 512)
    header += struct.pack('<H', 0xFFFE)             # byte order
    header += struct.pack('<H', 9)                  # sector shift (512)
    header += struct.pack('<H', 6)                  # mini sector shift (64)
    header += b'\x00' * 6                           # reserved
    header += struct.pack('<I', 0)                  # num dir sectors (0 for v3)
    header += struct.pack('<I', num_fat_sectors)    # num FAT sectors
    header += struct.pack('<I', dir_start)          # first dir sector
    header += struct.pack('<I', 0)                  # transaction sig
    header += struct.pack('<I', MINI_CUTOFF)        # mini stream cutoff
    header += struct.pack('<I', minifat_start if num_minifat_sectors else ENDOFCHAIN)
    header += struct.pack('<I', num_minifat_sectors)
    header += struct.pack('<I', ENDOFCHAIN)         # first DIFAT sector
    header += struct.pack('<I', 0)                  # num DIFAT sectors
    for v in header_difat:
        header += struct.pack('<I', v)
    assert len(header) == 512, len(header)

    return bytes(header) + bytes(body) + fat_bytes
