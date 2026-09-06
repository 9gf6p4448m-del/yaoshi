import sys
from PIL import Image, ImageChops
a=Image.open(sys.argv[1]).convert("RGB"); b=Image.open(sys.argv[2]).convert("RGB")
d=ImageChops.difference(a,b); px=d.load(); W,H=d.size
thr=int(sys.argv[3]) if len(sys.argv)>3 else 8
n=0; xs=[]; ys=[]
for y in range(H):
    for x in range(W):
        r,g,bb=px[x,y]
        if r>thr or g>thr or bb>thr: n+=1; xs.append(x); ys.append(y)
print("size",W,H,"diffpx(>%d)"%thr,n, "bbox", (min(xs),min(ys),max(xs),max(ys)) if n else None)
if len(sys.argv)>4:
    m=Image.new("L",(W,H),0); mp=m.load()
    for x,y in zip(xs,ys): mp[x,y]=255
    m.save(sys.argv[4])
