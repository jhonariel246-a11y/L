"""MS-OVBA compression (CompressedContainer) per [MS-OVBA] 2.4.1."""
import struct


def _compress_chunk(data: bytes) -> bytes:
    """Compress up to 4096 bytes into a single CompressedChunk."""
    out = bytearray()
    src = 0
    n = len(data)
    while src < n:
        flag_pos = len(out)
        out.append(0)  # placeholder FlagByte
        flag = 0
        for bit in range(8):
            if src >= n:
                break
            # difference from chunk start (chunk starts at 0 for whole data)
            difference = src
            # compute bit split
            bit_count = max(4, (difference - 1).bit_length()) if difference > 0 else 4
            bit_count = min(12, max(4, bit_count))
            length_bits = 16 - bit_count
            max_length = (1 << length_bits) + 2
            # find longest match in window [0, src)
            best_len = 0
            best_off = 0
            # candidate positions: search backwards limited by max offset
            max_offset = 1 << bit_count
            start = max(0, src - max_offset)
            cand = src - 1
            while cand >= start:
                # match length
                l = 0
                while (src + l < n) and (l < max_length) and (data[cand + l] == data[src + l]):
                    l += 1
                if l > best_len:
                    best_len = l
                    best_off = src - cand
                cand -= 1
            if best_len >= 3:
                length_field = best_len - 3
                offset_field = best_off - 1
                token = (offset_field << length_bits) | length_field
                out += struct.pack('<H', token)
                flag |= (1 << bit)
                src += best_len
            else:
                out.append(data[src])
                src += 1
        out[flag_pos] = flag
    return bytes(out)


def compress(data: bytes) -> bytes:
    """Compress full data into a CompressedContainer."""
    result = bytearray()
    result.append(0x01)  # SignatureByte
    pos = 0
    n = len(data)
    while pos < n:
        chunk = data[pos:pos + 4096]
        pos += 4096
        compressed = _compress_chunk(chunk)
        if len(compressed) >= 4096:
            # store raw (rare); pad to 4096
            raw = chunk + b'\x00' * (4096 - len(chunk))
            header = 0x3000 | 0x0FFF  # flag=0, sig=011, size=4095
            result += struct.pack('<H', header)
            result += raw
        else:
            size = len(compressed) + 2 - 3  # chunk bytes (incl header) - 3
            header = 0x8000 | 0x3000 | (size & 0x0FFF)  # flag=1, sig=011
            result += struct.pack('<H', header)
            result += compressed
    return bytes(result)


def decompress(data: bytes) -> bytes:
    """Reference decompressor to self-test compress()."""
    assert data[0] == 0x01
    out = bytearray()
    pos = 1
    n = len(data)
    while pos < n:
        header = struct.unpack('<H', data[pos:pos + 2])[0]
        pos += 2
        size = (header & 0x0FFF) + 3
        flag = (header >> 15) & 1
        chunk_start = len(out)
        end = pos + size - 2
        if flag == 0:
            out += data[pos:pos + 4096]
            pos += 4096
        else:
            while pos < end:
                fb = data[pos]; pos += 1
                for bit in range(8):
                    if pos >= end:
                        break
                    if (fb >> bit) & 1:
                        token = struct.unpack('<H', data[pos:pos + 2])[0]; pos += 2
                        difference = len(out) - chunk_start
                        bit_count = min(12, max(4, (difference - 1).bit_length())) if difference > 0 else 4
                        length_bits = 16 - bit_count
                        length_mask = (1 << length_bits) - 1
                        length = (token & length_mask) + 3
                        offset = (token >> length_bits) + 1
                        for _ in range(length):
                            out.append(out[len(out) - offset])
                    else:
                        out.append(data[pos]); pos += 1
    return bytes(out)


if __name__ == '__main__':
    sample = ("Attribute VB_Name = \"Module1\"\r\n" * 50).encode('latin-1')
    c = compress(sample)
    assert decompress(c) == sample, "roundtrip failed"
    print("ovba roundtrip OK", len(sample), "->", len(c))
