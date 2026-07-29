"""Build a vbaProject.bin from scratch per [MS-OVBA]."""
import struct
import ovba
import cfb

CP = 'cp1252'


def rec(id_, data):
    return struct.pack('<HI', id_, len(data)) + data


def _u16(s):
    return s.encode('utf-16-le')


def _mbcs(s):
    return s.encode(CP)


# ---- MS-OVBA 2.4.2 Data Encryption (for CMG/DPB/GC) ----
def data_encrypt(data: bytes, project_key: int = 0, seed: int = 0x00) -> str:
    version = 2
    out = bytearray()
    out.append(seed)
    enc2 = seed ^ version          # VersionEnc  (EncryptedByte2)
    enc1 = seed ^ project_key      # ProjectKeyEnc (EncryptedByte1)
    out.append(enc2)
    out.append(enc1)
    unenc1 = project_key
    ignored_len = (seed & 6) // 2
    stream = bytes([0] * ignored_len) + struct.pack('<I', len(data)) + data
    # first `ignored_len` bytes are "ignored" random -> we used zeros
    for b in stream:
        byte_enc = (b ^ ((enc2 + unenc1) & 0xFF)) & 0xFF
        out.append(byte_enc)
        enc2 = enc1
        enc1 = byte_enc
        unenc1 = b
    return out.hex().upper()


def build_dir(project_name, references, modules):
    d = bytearray()
    # PROJECTINFORMATION
    d += rec(0x0001, struct.pack('<I', 0x00000001))          # SYSKIND (32-bit)
    d += rec(0x0002, struct.pack('<I', 0x00000409))          # LCID
    d += rec(0x0014, struct.pack('<I', 0x00000409))          # LCIDINVOKE
    d += rec(0x0003, struct.pack('<H', 0x04E4))              # CODEPAGE (1252)
    d += rec(0x0004, _mbcs(project_name))                    # NAME
    # DOCSTRING
    d += struct.pack('<HI', 0x0005, 0) + struct.pack('<HI', 0x0040, 0)
    # HELPFILEPATH
    d += struct.pack('<HI', 0x0006, 0) + struct.pack('<HI', 0x003D, 0)
    d += rec(0x0007, struct.pack('<I', 0))                   # HELPCONTEXT
    d += rec(0x0008, struct.pack('<I', 0))                   # LIBFLAGS
    # PROJECTVERSION: Id, Reserved(=4), VersionMajor(4), VersionMinor(2)
    d += struct.pack('<HI', 0x0009, 0x00000004)
    d += struct.pack('<IH', 1, 0)
    # CONSTANTS
    d += struct.pack('<HI', 0x000C, 0) + struct.pack('<HI', 0x003C, 0)

    # PROJECTREFERENCES
    for name, libid in references:
        # REFERENCENAME
        nm = _mbcs(name)
        d += rec(0x0016, nm)
        d += struct.pack('<HI', 0x003E, len(_u16(name))) + _u16(name)
        # REFERENCEREGISTERED (0x000D)
        lib = _mbcs(libid)
        inner = struct.pack('<I', len(lib)) + lib + struct.pack('<IH', 0, 0)
        d += struct.pack('<HI', 0x000D, len(inner)) + inner

    # PROJECTMODULES
    d += rec(0x000F, struct.pack('<H', len(modules)))        # count
    d += rec(0x0013, struct.pack('<H', 0xFFFF))              # PROJECTCOOKIE
    for m in modules:
        name = m['name']
        d += rec(0x0019, _mbcs(name))                        # MODULENAME
        d += rec(0x0047, _u16(name))                         # MODULENAMEUNICODE
        # MODULESTREAMNAME
        d += rec(0x001A, _mbcs(name))
        d += struct.pack('<HI', 0x0032, len(_u16(name))) + _u16(name)
        # MODULEDOCSTRING
        d += struct.pack('<HI', 0x001C, 0) + struct.pack('<HI', 0x0048, 0)
        d += rec(0x0031, struct.pack('<I', 0))               # MODULEOFFSET = 0
        d += rec(0x001E, struct.pack('<I', 0))               # MODULEHELPCONTEXT
        d += rec(0x002C, struct.pack('<H', 0xFFFF))          # MODULECOOKIE
        d += struct.pack('<HI', 0x0022 if m['document'] else 0x0021, 0)  # MODULETYPE
        d += struct.pack('<HI', 0x002B, 0)                   # MODULETERMINATOR
    d += struct.pack('<HI', 0x0010, 0)                       # Terminator
    return ovba.compress(bytes(d))


def build_project_stream(project_name, modules):
    lines = []
    lines.append('ID="{5DD2A2E3-3F5B-4C2A-9E7D-1A2B3C4D5E6F}"')
    for m in modules:
        if m['document']:
            lines.append('Document=%s/&H00000000' % m['name'])
        else:
            lines.append('Module=%s' % m['name'])
    lines.append('Name="%s"' % project_name)
    lines.append('HelpContextID="0"')
    lines.append('VersionCompatible32="393222000"')
    lines.append('CMG="%s"' % data_encrypt(struct.pack('<I', 0)))         # protection state
    lines.append('DPB="%s"' % data_encrypt(b'\x00'))                       # no password
    lines.append('GC="%s"' % data_encrypt(b'\xFF'))                        # visibility
    lines.append('')
    lines.append('[Host Extender Info]')
    lines.append('&H00000001={3832D640-CF90-11CF-8E43-00A0C911005A};VBE;&H00000000')
    lines.append('')
    lines.append('[Workspace]')
    for m in modules:
        lines.append('%s=0, 0, 0, 0, C' % m['name'])
    return ('\r\n'.join(lines) + '\r\n').encode(CP)


def build_projectwm(modules):
    out = bytearray()
    for m in modules:
        out += _mbcs(m['name']) + b'\x00' + _u16(m['name']) + b'\x00\x00'
    out += b'\x00\x00'
    return bytes(out)


def build_vba_project_stream():
    return b'\xCC\x61\xFF\xFF\x00\x00\x00'


def build(project_name, modules, references):
    """modules: list of {name, document, source(str)}."""
    # Root children: PROJECT, PROJECTwm, VBA storage
    vba_children = []
    vba_children.append(_stream('_VBA_PROJECT', build_vba_project_stream()))
    vba_children.append(_stream('dir', build_dir(project_name, references, modules)))
    for m in modules:
        src = m['source'].replace('\n', '\r\n').encode(CP)
        vba_children.append(_stream(m['name'], ovba.compress(src)))
    vba_storage = cfb.Entry('VBA', True)
    vba_storage.children = vba_children

    root_children = [
        _stream('PROJECT', build_project_stream(project_name, modules)),
        _stream('PROJECTwm', build_projectwm(modules)),
        vba_storage,
    ]
    return cfb.write_cfb(root_children)


def _stream(name, data):
    e = cfb.Entry(name, False)
    e.data = data
    return e
