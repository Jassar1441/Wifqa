from pathlib import Path
import json, hashlib, ctypes, ctypes.util, xml.etree.ElementTree as ET

OUT=Path(__file__).parent
# Newly constructed calligraphic glyph masters; no glyph originals existed upstream.
PATHS={
'waw-master':'M 129,65 C 103,86 88,106 89,128 C 89,152 109,169 130,163 C 146,159 153,146 155,130 C 176,172 181,207 163,238 C 150,260 129,279 105,289 C 125,262 136,239 134,216 C 132,192 122,177 111,163 C 80,161 67,139 73,112 C 79,90 101,71 129,65 Z M 124,89 C 111,98 104,110 105,123 C 106,137 115,145 126,141 C 138,137 140,123 136,111 C 133,102 129,94 124,89 Z',
'fa-master':'M 146,55 C 176,76 198,105 197,133 C 196,157 183,172 164,175 C 145,178 133,159 132,139 C 130,109 136,81 146,55 Z M 190,153 C 214,166 233,190 229,217 C 225,257 190,291 151,304 C 120,315 88,317 70,283 C 85,299 106,299 124,291 C 148,281 167,272 181,262 C 208,239 205,208 179,177 Z M 158,83 C 170,94 180,108 181,121 C 182,135 175,147 165,148 C 156,149 149,141 148,130 C 146,117 150,97 158,83 Z',
'fa-dot':'M 147,12 L 165,31 L 147,50 L 129,31 Z'}
DEFS='<defs>'+''.join(f'<path id="{k}" d="{v}" fill-rule="evenodd"/>' for k,v in PATHS.items())+'</defs>'
def uses(overlay=False):
    colors=['#F8F5EC','#D4AF7C','#D4AF7C'] if not overlay else ['#D4AF7C','#F8F5EC','#F8F5EC']
    return ''.join(f'<use href="#{k}" transform="{"translate(0 0)"}" fill="{c}" opacity="{.7 if overlay else 1}"/>' for k,c in zip(PATHS,colors))
def wrap(body,w=360,h=400,view='0 0 300 360'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}" height="{h}" viewBox="{view}"><title>WIFQA symbol geometry study — not approved</title>{DEFS}<rect x="0" y="0" width="2000" height="1000" fill="#0F3D2E"/>{body}</svg>'
(OUT/'symbol.svg').write_text(wrap('<g id="symbol-final">'+uses()+'</g>'))
(OUT/'overlay.svg').write_text(wrap('<g id="symbol-final">'+uses()+'</g><g id="glyph-overlay">'+uses(True)+'</g>'))
# No newly drawn explanatory paths: all columns instantiate master geometry.
body='<g transform="translate(30 25)"><use href="#waw-master" fill="#F8F5EC"/></g>'
body+='<g transform="translate(340 25)"><use href="#fa-master" fill="#D4AF7C"/><use href="#fa-dot" fill="#D4AF7C"/></g>'
body+='<g transform="translate(650 25)">'+uses()+'</g><g transform="translate(960 25)">'+uses()+uses(True)+'</g>'
(OUT/'derivation.svg').write_text(wrap(body,1320,410,'0 0 1290 400'))
manifest={'status':'draft; owner visual acceptance and independent QA pending','upstream':'design/reference-inspired-2026-10-14-am@d156cad52e95c806da45a97bd2ec7a49fedde482','original_glyphs_found':False,'provenance':'New custom vector letter masters; upstream ribbons retained as reference, not relabelled as letters.','symbol_transform':{'waw-master':'translate(0 0)','fa-master':'translate(0 0)','fa-dot':'translate(0 0)'},'overlay_transform':'same as final exactly','columns':['waw original master','fa original master + diamond dot','final assembled from same masters','overlay: same masters, swapped existing palette colors, opacity 0.7'],'paths':[{'id':k,'d':v,'sha256':hashlib.sha256(v.encode()).hexdigest(),'final_ref':'#'+k,'overlay_ref':'#'+k,'deformation':'none'} for k,v in PATHS.items()]}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
ns={'s':'http://www.w3.org/2000/svg'}
root=ET.parse(OUT/'overlay.svg').getroot()
g=root.findall('s:g',ns)
assert [u.get('href') for u in g[0]]==[u.get('href') for u in g[1]]==['#'+k for k in PATHS]
assert [u.get('transform') for u in g[0]] == [u.get('transform') for u in g[1]]
(OUT/'verification.txt').write_text('PASS: 3 canonical defs; final and overlay both reference exact same 3 IDs; same transforms; translation only, no deformation; no explanatory paths.\nLIMIT: structural equality does not establish visual acceptability.\n')
# librsvg renders with no browser dependency.
r=ctypes.CDLL(ctypes.util.find_library('rsvg-2')); c=ctypes.CDLL(ctypes.util.find_library('cairo')); o=ctypes.CDLL(ctypes.util.find_library('gobject-2.0'))
r.rsvg_handle_new_from_file.argtypes=[ctypes.c_char_p,ctypes.c_void_p]; r.rsvg_handle_new_from_file.restype=ctypes.c_void_p
c.cairo_image_surface_create.argtypes=[ctypes.c_int,ctypes.c_int,ctypes.c_int];c.cairo_image_surface_create.restype=ctypes.c_void_p
c.cairo_create.argtypes=[ctypes.c_void_p];c.cairo_create.restype=ctypes.c_void_p
r.rsvg_handle_render_cairo.argtypes=[ctypes.c_void_p,ctypes.c_void_p];r.rsvg_handle_render_cairo.restype=ctypes.c_int
c.cairo_surface_write_to_png.argtypes=[ctypes.c_void_p,ctypes.c_char_p]
c.cairo_destroy.argtypes=[ctypes.c_void_p];c.cairo_surface_destroy.argtypes=[ctypes.c_void_p];o.g_object_unref.argtypes=[ctypes.c_void_p]
for name,w,h in [('symbol',360,400),('overlay',360,400),('derivation',1320,410),('before-reference',360,400)]:
    handle=r.rsvg_handle_new_from_file(str(OUT/(name+'.svg')).encode(),None); surface=c.cairo_image_surface_create(0,w,h);ctx=c.cairo_create(surface)
    assert r.rsvg_handle_render_cairo(handle,ctx)
    assert c.cairo_surface_write_to_png(surface,str(OUT/(name+'.png')).encode())==0
    c.cairo_destroy(ctx);c.cairo_surface_destroy(surface);o.g_object_unref(handle)
print('PASS: canonical paths verified; 3 SVGs rendered through librsvg')
