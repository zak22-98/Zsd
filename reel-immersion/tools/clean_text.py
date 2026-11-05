"""Efface le texte incrusté des captures (masque couleur + inpainting OpenCV)."""
import sys, cv2, numpy as np

SRC = sys.argv[1]; OUT = sys.argv[2]
JOBS = {
  # nom: (fichier source, [zones texte x0,y0,x1,y1], [zones pleines à effacer entièrement])
  "cta":      ("89271b4e", [(150,965,930,1170),(140,1390,940,1555),(150,1590,930,1645)], [(225,1215,855,1365)]),
  "immersion":("025b7daa", [(220,290,860,360),(90,365,990,510),(80,550,1000,700),(190,1470,890,1635)], []),
  "confiance":("2915ed64", [(160,345,920,540),(270,595,810,680),(80,690,1000,800),(330,825,750,910),(130,920,950,985),(340,1010,740,1095),(130,1100,950,1215),(90,1295,990,1510),(280,1530,800,1570)], []),
  "concept":  ("7267da5d", [(165,1060,915,1170),(80,1210,1000,1530),(75,1550,1005,1635)], []),
  "hook":     ("40b4faeb", [(190,790,890,1395),(210,1450,870,1535),(260,1595,820,1640)], []),
}
for name,(f,rects,solid) in JOBS.items():
    img = cv2.imread(f"{SRC}/{f}-image.png")
    b,g,r = [img[...,i].astype(int) for i in range(3)]
    white = (r>175)&(g>175)&(b>165)
    gold  = (r>170)&(g>140)&(b<175)&(r-b>35)
    textpx = (white|gold).astype(np.uint8)*255
    mask = np.zeros(img.shape[:2],np.uint8)
    for x0,y0,x1,y1 in rects: mask[y0:y1,x0:x1] = textpx[y0:y1,x0:x1]
    mask = cv2.dilate(mask, np.ones((9,9),np.uint8), iterations=2)
    for x0,y0,x1,y1 in solid: cv2.rectangle(mask,(x0-6,y0-6),(x1+6,y1+6),255,-1)
    out = cv2.inpaint(img, mask, 9, cv2.INPAINT_TELEA)
    # adoucir les zones réparées pour masquer les traînées
    blur = cv2.GaussianBlur(out,(0,0),14)
    soft = cv2.GaussianBlur(cv2.dilate(mask,np.ones((25,25),np.uint8)),(0,0),12)[...,None]/255.0
    out = (out*(1-soft)+blur*soft).astype(np.uint8)
    cv2.imwrite(f"{OUT}/{name}.jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(name, "ok")
