"""Frame a 390x844 @2x phone capture: 12 px #16161C bezel, outer radius 48, transparent background, 780 px wide."""
import sys
from PIL import Image, ImageDraw
W, BEZ, RO = 780, 12, 48
def rr(size, r):
    m = Image.new('L', size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0]-1, size[1]-1), r, fill=255); return m
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src).convert('RGBA')
    iw = W - 2*BEZ; ih = round(im.height * iw / im.width)
    im = im.resize((iw, ih), Image.LANCZOS)
    H = ih + 2*BEZ
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(Image.new('RGBA', (W, H), (0x16, 0x16, 0x1C, 255)), (0, 0), rr((W, H), RO))
    out.paste(im, (BEZ, BEZ), rr((iw, ih), RO - BEZ))
    out.save(dst, optimize=True)
