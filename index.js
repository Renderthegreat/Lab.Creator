const fs = require("fs");
let buffer = {}
class Lab {
  constructor(options) {
    this.options = options;
  }
  build() {}
}
function uProgress(progress) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(`Progress: ${progress}%`);
}
function rgb2xyz(color){
  const xyz = {}
  xyz.x = color.r
  xyz.y = color.g
  xyz.z = color.b
  return xyz
}
class Ray {
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = direction;
  }

  at(t) {
    return {
      x: this.origin.x + t * this.direction.x,
      y: this.origin.y + t * this.direction.y,
      z: this.origin.z + t * this.direction.z,
    };
  }
}

class Sphere {
  constructor(center, radius, color) {
    this.center = center;
    this.radius = radius;
    this.color = color;
  }

  hit(ray) {
    const oc = {
      x: ray.origin.x - this.center.x,
      y: ray.origin.y - this.center.y,
      z: ray.origin.z - this.center.z,
    };
    const a =
      ray.direction.x * ray.direction.x +
      ray.direction.y * ray.direction.y +
      ray.direction.z * ray.direction.z;
    const half_b =
      oc.x * ray.direction.x + oc.y * ray.direction.y + oc.z * ray.direction.z;
    const c =
      oc.x * oc.x + oc.y * oc.y + oc.z * oc.z - this.radius * this.radius;
    const discriminant = half_b * half_b - a * c;
    if (discriminant < 0) {
      return -1;
    } else {
      return (-half_b - Math.sqrt(discriminant)) / a;
    }
  }
}

class Render {
  constructor(options) {
    buffer.defaultMaterial = options.defaultMaterial;
    buffer.vec3 = this.vec3
    buffer.scale = this.scale
    buffer.reflect = this.reflect
    buffer.dot = this.dot
    buffer.unitVector = this.unitVector
    buffer.add = this.add
    this.materials = options.materials || {};
    buffer.materials = this.materials;
    this.defaultMaterial = options.defaultMaterial || {
      color: { r: 0.5, g: 0.5, b: 0.5 },
    };
    this.shaders = options.shaders || {};
    this.defaultShader = this.shaders.default;
  }

  vec3(x, y, z) {
    return { x, y, z };
  }

  dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  }

  add(v1, v2) {
    return this.vec3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
  }

  scale(v, t) {
    return this.vec3(v.x * t, v.y * t, v.z * t);
  }

  unitVector(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return this.scale(v, 1 / length);
  }

  rayColor(ray, world) {
    let closestHit = Number.POSITIVE_INFINITY;
    let hitObject = null;
    for (const object of world) {
      const t = object.hit(ray);
      if (t > 0 && t < closestHit) {
        closestHit = t;
        hitObject = object;
      }
    }
    if (hitObject) {
      const shader = this.shaders[hitObject.shader] || this.defaultShader;
      let shard = shader(hitObject, ray);
      
      return shard
    }
    const unitDirection = this.unitVector(ray.direction);
    const t = 0.5 * (unitDirection.y + 1.0);
    return this.add(
      this.scale(this.vec3(1.0, 1.0, 1.0), 1.0 - t),
      this.scale(this.vec3(0.5, 0.7, 1.0), t),
    );
  }
  reflect(incoming, normal) {
    const factor = 2 * this.dot(incoming, normal);
    const reflected = this.add(incoming, this.scale(normal, -factor));
    return this.unitVector(reflected);
  }
  render(objects, width, height, viewportWidth, viewportHeight, focalLength) {
    let data = "P3\n" + width + " " + height + "\n255\n";
    const lowerLeftCorner = this.vec3(
      -viewportWidth / 2,
      -viewportHeight / 2,
      -focalLength,
    );
    const horizontal = this.vec3(viewportWidth, 0, 0);
    const vertical = this.vec3(0, viewportHeight, 0);
    const origin = this.vec3(0, 0, 0);
    let x = 0;
    let c = 0;
    const a = (height - 1) * (width - 1);
    let e = 1;
    let xo = 0;
    while (a / e >= 100) {
      e = e * 10;
    }
    e *= 1000;
    for (let j = height - 1; j >= 0; j--) {
      for (let i = 0; i < width; i++) {
        c++;
        const u = i / (width - 1);
        const v = j / (height - 1);
        const direction = this.add(
          this.add(lowerLeftCorner, this.scale(horizontal, u)),
          this.scale(vertical, v),
        );
        const ray = new Ray(origin, direction);
        const color = this.rayColor(ray, objects);
        
        const ir = Math.floor(255.999 * color.x);
        const ig = Math.floor(255.999 * color.y);
        const ib = Math.floor(255.999 * color.z);
        data += ir + " " + ig + " " + ib + "\n";
        
        x = ((a / 100) * c) / e / 2.3;
        x = Math.round(x);
        if (xo != x) {
          uProgress(x);
          xo = x;
        }
      }
      
    }

    return data;
  }
}

const renderer = new Render({
  materials: {
    red: { color: { r: 1, g: 0, b: 0 } },
    blue: { color: { r: 0, g: 0, b: 1 } },
  },
  defaultMaterial: { color: { r: 0.5, g: 0.5, b: 0.5 } },
  shaders: {
    default: function (o, ray) {
      let object = o;
      const ambientStrength = 0.1;
      const diffuseStrength = 0.5;
      const specularStrength = 0.5;
      const shininess = 32;
      if(buffer.materials[object.color]){
        object.color = buffer.materials[object.color]
        object.color = object.color.color
      }
      // Ambient component
      const ambient = {
        r: buffer.defaultMaterial.color.r * ambientStrength,
        g: buffer.defaultMaterial.color.g * ambientStrength,
        b: buffer.defaultMaterial.color.b * ambientStrength,
      };
      // Diffuse component
      const lightDirection = { x: 0, y: 0, z: -1 }; // Example light direction
      const normal = { x: 0, y: 0, z: -1 }; // Example surface normal (assuming facing the camera)
      const dotProduct = Math.max(0, buffer.dot(normal, lightDirection));
      const diffuse = {
        r: object.color.r * dotProduct * diffuseStrength,
        g: object.color.g * dotProduct * diffuseStrength,
        b: object.color.b * dotProduct * diffuseStrength,
      };
      
      // Specular component
      const viewDirection = buffer.unitVector(ray.direction);
      const reflectionDirection = buffer.reflect(buffer.scale(lightDirection, -1), normal);
      const specularDotProduct = Math.pow(Math.max(0, buffer.dot(viewDirection, reflectionDirection)), shininess);
      const specular = {
        r: specularStrength * specularDotProduct,
        g: specularStrength * specularDotProduct,
        b: specularStrength * specularDotProduct,
      };

      const finalColor = rgb2xyz( {
        r: ambient.r + diffuse.r + specular.r,
        g: ambient.g + diffuse.g + specular.g,
        b: ambient.b + diffuse.b + specular.b,
      });
      
      finalColor.x = Math.min(1, Math.max(0, finalColor.x));
      finalColor.y = Math.min(1, Math.max(0, finalColor.y));
      finalColor.z = Math.min(1, Math.max(0, finalColor.z));
      
      return finalColor;
    },
  },
});

const objects = [
  new Sphere({ x: 0, y: 0, z: -1 }, 0.5, "red", "default"),
  new Sphere({ x: 0, y: -100.5, z: -1 }, 100, "blue", "default"),
];

const width = 800;
const height = 600;
const viewportWidth = 2.0;
const viewportHeight = (height / width) * viewportWidth;
const focalLength = 1.0;

const imageData = renderer.render(
  objects,
  width,
  height,
  viewportWidth,
  viewportHeight,
  focalLength,
);

fs.writeFileSync("output.ppm", imageData);
if(imageData.includes("NaN")){
  console.log("\nError: NaN");
  let dumbErrorArea = imageData.split("NaN")
    console.log(dumbErrorArea[1]);
}