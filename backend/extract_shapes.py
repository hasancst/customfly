#!/usr/bin/env python3
"""
Script untuk mengekstrak shape data dari SQL dump Lumise
Hanya mengambil name dan content (SVG code)
"""

import json
import re

# SQL dump dari user (simplified untuk demo - dalam praktik akan membaca dari file)
sql_data = """
INSERT INTO `lumise_shapes` VALUES 
(3,'Arrow 1','<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\" viewBox=\"0 0 512 512\" style=\"enable-background:new 0 0 512 512;\" xml:space=\"preserve\"><path d=\"M506.134,241.843c-0.006-0.006-0.011-0.013-0.018-0.019l-104.504-104c-7.829-7.791-20.492-7.762-28.285,0.068 c-7.792,7.829-7.762,20.492,0.067,28.284L443.558,236H20c-11.046,0-20,8.954-20,20c0,11.046,8.954,20,20,20h423.557 l-70.162,69.824c-7.829,7.792-7.859,20.455-0.067,28.284c7.793,7.831,20.457,7.858,28.285,0.068l104.504-104 c0.006-0.006,0.011-0.013,0.018-0.019C513.968,262.339,513.943,249.635,506.134,241.843z\"/></svg>','shapes'),
(4,'Arrow 2','<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\" viewBox=\"0 0 512.171 512.171\" style=\"enable-background:new 0 0 512.171 512.171;\" xml:space=\"preserve\"><path d=\"M479.046,283.925c-1.664-3.989-5.547-6.592-9.856-6.592H352.305V10.667C352.305,4.779,347.526,0,341.638,0H170.971 c-5.888,0-10.667,4.779-10.667,10.667v266.667H42.971c-4.309,0-8.192,2.603-9.856,6.571c-1.643,3.989-0.747,8.576,2.304,11.627 l212.8,213.504c2.005,2.005,4.715,3.136,7.552,3.136s5.547-1.131,7.552-3.115l213.419-213.504 C479.793,292.501,480.71,287.915,479.046,283.925z\"/></svg>','shapes')
"""

# Parse SQL INSERT statement
# Pattern: (id,'name','content','category')
pattern = r"\((\d+),'([^']+)','([^']+)','[^']+'\)"

shapes = []
matches = re.findall(pattern, sql_data)

for match in matches:
    shape_id, name, content = match
    shapes.append({
        "name": name,
        "content": content
    })

# Write to JSON file
with open('lumise_shapes_data.json', 'w', encoding='utf-8') as f:
    json.dump(shapes, f, indent=2, ensure_ascii=False)

print(f"✅ Extracted {len(shapes)} shapes to lumise_shapes_data.json")
