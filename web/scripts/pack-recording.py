from pathlib import Path
import json,hashlib,gzip,struct,base64
import argparse
parser=argparse.ArgumentParser(description='Pack a recorded Three.js scene for browser playback.')
parser.add_argument('input',type=Path)
parser.add_argument('output',type=Path)
args=parser.parse_args()
data=json.loads(args.input.read_text())
geometries=[];seen={};replace={}
for geometry in data['object']['geometries']:
    key=hashlib.sha256(json.dumps({k:v for k,v in geometry.items() if k!='uuid'},sort_keys=True,separators=(',',':')).encode()).hexdigest()
    if key in seen:
        replace[geometry['uuid']]=seen[key]
        continue
    seen[key]=geometry['uuid'];geometries.append(geometry)
for child in data['object']['object']['children']:
    child['geometry']=replace.get(child['geometry'],child['geometry'])
    child['type']='Mesh'
    child.pop('userData',None)
data['object']['geometries']=geometries
# Store exact Float32 attributes as binary instead of decimal JSON arrays.
def pack_geometry(geometry):
    if 'data' not in geometry:return
    for attr in geometry['data'].get('attributes',{}).values():
        values=attr.pop('array',None)
        if values is not None:
            attr['base64']=base64.b64encode(struct.pack('<'+'f'*len(values),*values)).decode()
            attr['type']='Float32Array'
for geometry in geometries:pack_geometry(geometry)
for mesh in data['meshes']:
    for frame in mesh['geometryFrames']:pack_geometry(frame['geometry'])
    if all(frame==mesh['frames'][0] for frame in mesh['frames']):
        mesh['frames']=mesh['frames'][:1]
# Replace the renderer-specific ground reflector with a standard material.
for material in data['object']['materials']:
    if material['type']=='ShaderMaterial':
        material.clear();material.update({'uuid':'ground','type':'MeshStandardMaterial','color':13421770,'roughness':.85,'metalness':0})
if not any(m['uuid']=='ground' for m in data['object']['materials']):
    data['object']['materials'].append({'uuid':'ground','type':'MeshStandardMaterial','color':12895420,'roughness':.85,'metalness':0})
for child in data['object']['object']['children']:
    # mesh_0 is the MuJoCo floor reflector.
    if child['name']=='mesh_0':child['material']='ground'
payload=json.dumps(data,separators=(',',':')).encode()
args.output.write_bytes(gzip.compress(payload,compresslevel=9,mtime=0))
print('Unique geometry', len(geometries), 'payload', len(payload), 'gzip', args.output.stat().st_size)
