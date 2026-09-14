import bpy
import os
import gzip

output = os.path.abspath('public/models/controller/controller.glb')
os.makedirs(os.path.dirname(output), exist_ok=True)

print('CONTROLLER_SCENE')
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        polygons = len(obj.data.polygons)
        materials = [slot.material.name if slot.material else '(empty)' for slot in obj.material_slots]
        print(f'MESH {obj.name!r} polygons={polygons} materials={materials}')

# Replace Blender-specific shader groups with portable Principled materials.
for material in bpy.data.materials:
    name = material.name.lower()
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output_node = nodes.new('ShaderNodeOutputMaterial')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    material.node_tree.links.new(shader.outputs['BSDF'], output_node.inputs['Surface'])
    color = (0.07, 0.08, 0.11, 1)
    metallic = 0.05
    roughness = 0.38
    if 'white' in name:
        color, roughness = (0.72, 0.75, 0.82, 1), 0.24
    elif 'emission' in name:
        color, roughness = (0.05, 0.24, 1, 1), 0.28
        shader.inputs['Emission Color'].default_value = (0.03, 0.18, 1, 1)
        shader.inputs['Emission Strength'].default_value = 3
    elif 'contact' in name or name == 'usb' or 'logo' in name:
        color, metallic, roughness = (0.27, 0.32, 0.43, 1), 0.82, 0.2
    elif 'glas' in name:
        color, metallic, roughness = (0.18, 0.23, 0.36, 1), 0.12, 0.14
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness

bpy.ops.export_scene.gltf(
    filepath=output,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_yup=True,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False,
)
packed = os.path.abspath('public/models/controller/controller.bin')
with open(output, 'rb') as source, gzip.open(packed, 'wb', compresslevel=9) as target:
    target.write(source.read())
os.remove(output)
print(f'EXPORTED {packed} bytes={os.path.getsize(packed)}')
