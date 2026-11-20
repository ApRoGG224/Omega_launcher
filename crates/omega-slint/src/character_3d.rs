use image::RgbaImage;

#[derive(Clone, Copy)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    pub fn dot(self, other: Self) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(self, other: Self) -> Self {
        Self {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }

    pub fn normalize(self) -> Self {
        let len = (self.x * self.x + self.y * self.y + self.z * self.z).sqrt();
        if len > 0.0001 {
            Self {
                x: self.x / len,
                y: self.y / len,
                z: self.z / len,
            }
        } else {
            self
        }
    }
}

#[derive(Clone, Copy)]
struct Vertex {
    pos: Vec3,
    u: f32,
    v: f32,
}

#[derive(Clone, Copy)]
struct ScreenVertex {
    x: f32,
    y: f32,
    z: f32,
    u: f32,
    v: f32,
}

struct Quad {
    v0: Vertex,
    v1: Vertex,
    v2: Vertex,
    v3: Vertex,
}

impl Quad {
    fn new(
        p0: Vec3,
        p1: Vec3,
        p2: Vec3,
        p3: Vec3,
        u0: f32,
        v0: f32,
        u1: f32,
        v1: f32,
    ) -> Self {
        Self {
            v0: Vertex { pos: p0, u: u0, v: v0 },
            v1: Vertex { pos: p1, u: u1, v: v0 },
            v2: Vertex { pos: p2, u: u1, v: v1 },
            v3: Vertex { pos: p3, u: u0, v: v1 },
        }
    }
}

pub struct Character3D {
    pub skin: RgbaImage,
    pub is_alex: bool,
}

impl Character3D {
    pub fn new(skin: RgbaImage, is_alex: bool) -> Self {
        Self { skin, is_alex }
    }

    pub fn render(&self, width: u32, height: u32, time_secs: f32) -> Vec<u8> {
        let mut pixels = vec![0u8; (width * height * 4) as usize];
        let mut z_buffer = vec![f32::NEG_INFINITY; (width * height) as usize];

        // Draw soft contact shadow on floor under character
        let floor_center_x = (width as f32) * 0.5;
        let floor_center_y = (height as f32) * 0.88;
        let shadow_rx = 48.0f32;
        let shadow_ry = 14.0f32;

        for sy in (floor_center_y - shadow_ry) as i32..=(floor_center_y + shadow_ry) as i32 {
            for sx in (floor_center_x - shadow_rx) as i32..=(floor_center_x + shadow_rx) as i32 {
                if sx >= 0 && sx < width as i32 && sy >= 0 && sy < height as i32 {
                    let dx = (sx as f32 - floor_center_x) / shadow_rx;
                    let dy = (sy as f32 - floor_center_y) / shadow_ry;
                    let dist_sq = dx * dx + dy * dy;
                    if dist_sq <= 1.0 {
                        let alpha = ((1.0 - dist_sq).sqrt() * 110.0) as u8;
                        let idx = ((sy as u32 * width + sx as u32) * 4) as usize;
                        pixels[idx] = 0;
                        pixels[idx + 1] = 0;
                        pixels[idx + 2] = 0;
                        pixels[idx + 3] = alpha;
                    }
                }
            }
        }

        // Camera / View angles
        let yaw = -0.36; // ~-21 degrees, classic 3/4 turn
        let pitch = 0.16; // ~9 degrees, looking slightly down

        // Subtle breathing animation (0.5 Hz)
        let breath = (time_secs * 2.2).sin();
        let breath_cos = (time_secs * 2.2).cos();

        let head_rot_x = breath * 0.025;
        let head_rot_y = (time_secs * 0.8).sin() * 0.05;

        let arm_w = if self.is_alex { 3.0 } else { 4.0 };

        let r_arm_rot_x = breath * 0.035;
        let r_arm_rot_z = -0.06 - breath_cos * 0.025;

        let l_arm_rot_x = -breath * 0.035;
        let l_arm_rot_z = 0.06 + breath_cos * 0.025;

        let torso_y_off = breath * 0.35;

        let mut quads = Vec::with_capacity(36);

        // 1. Torso: 8x12x4, Waist at (0, 12, 0)
        let torso_pivot = Vec3::new(0.0, 12.0 + torso_y_off, 0.0);
        add_cuboid(
            &mut quads,
            torso_pivot,
            Vec3::new(0.0, 0.0, 0.0),
            -4.0, 4.0, 0.0, 12.0, -2.0, 2.0,
            20.0, 16.0, 8.0, 12.0, 4.0,
        );

        // 2. Head: 8x8x8, Neck at (0, 24, 0)
        let head_pivot = Vec3::new(0.0, 24.0 + torso_y_off, 0.0);
        add_cuboid(
            &mut quads,
            head_pivot,
            Vec3::new(head_rot_x, head_rot_y, 0.0),
            -4.0, 4.0, 0.0, 8.0, -4.0, 4.0,
            0.0, 0.0, 8.0, 8.0, 8.0,
        );

        // 3. Right Arm: arm_w x 12 x 4
        let r_arm_pivot = Vec3::new(-4.0 - arm_w * 0.5, 22.0 + torso_y_off, 0.0);
        add_cuboid(
            &mut quads,
            r_arm_pivot,
            Vec3::new(r_arm_rot_x, 0.0, r_arm_rot_z),
            -arm_w * 0.5, arm_w * 0.5, -10.0, 2.0, -2.0, 2.0,
            40.0, 16.0, arm_w, 12.0, 4.0,
        );

        // 4. Left Arm: arm_w x 12 x 4
        let l_arm_pivot = Vec3::new(4.0 + arm_w * 0.5, 22.0 + torso_y_off, 0.0);
        add_cuboid(
            &mut quads,
            l_arm_pivot,
            Vec3::new(l_arm_rot_x, 0.0, l_arm_rot_z),
            -arm_w * 0.5, arm_w * 0.5, -10.0, 2.0, -2.0, 2.0,
            32.0, 48.0, arm_w, 12.0, 4.0,
        );

        // 5. Right Leg: 4x12x4
        let r_leg_pivot = Vec3::new(-2.0, 12.0, 0.0);
        add_cuboid(
            &mut quads,
            r_leg_pivot,
            Vec3::new(0.0, 0.0, 0.0),
            -2.0, 2.0, -12.0, 0.0, -2.0, 2.0,
            0.0, 16.0, 4.0, 12.0, 4.0,
        );

        // 6. Left Leg: 4x12x4
        let l_leg_pivot = Vec3::new(2.0, 12.0, 0.0);
        add_cuboid(
            &mut quads,
            l_leg_pivot,
            Vec3::new(0.0, 0.0, 0.0),
            -2.0, 2.0, -12.0, 0.0, -2.0, 2.0,
            16.0, 48.0, 4.0, 12.0, 4.0,
        );

        // Light direction (top-right-front)
        let light_dir = Vec3::new(0.35, 0.85, 0.40).normalize();

        // Screen transform
        let scale = 7.4f32;
        let center_x = (width as f32) * 0.5;
        let center_y = (height as f32) * 0.62;

        for quad in quads {
            // Apply camera pitch and yaw
            let v0 = transform_view(quad.v0.pos, yaw, pitch);
            let v1 = transform_view(quad.v1.pos, yaw, pitch);
            let v2 = transform_view(quad.v2.pos, yaw, pitch);
            let v3 = transform_view(quad.v3.pos, yaw, pitch);

            // Compute face normal in view space
            let edge1 = Vec3::new(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
            let edge2 = Vec3::new(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z);
            let normal = edge1.cross(edge2).normalize();

            // Backface culling: if normal points away from viewer (Z < 0), cull
            if normal.z <= 0.0 {
                continue;
            }

            // Authentic Minecraft shading
            let diff = (normal.dot(light_dir)).max(0.0);
            let shade = (0.68 + diff * 0.32).clamp(0.60, 1.0);

            let sv0 = ScreenVertex {
                x: center_x + v0.x * scale,
                y: center_y - v0.y * scale,
                z: v0.z,
                u: quad.v0.u,
                v: quad.v0.v,
            };
            let sv1 = ScreenVertex {
                x: center_x + v1.x * scale,
                y: center_y - v1.y * scale,
                z: v1.z,
                u: quad.v1.u,
                v: quad.v1.v,
            };
            let sv2 = ScreenVertex {
                x: center_x + v2.x * scale,
                y: center_y - v2.y * scale,
                z: v2.z,
                u: quad.v2.u,
                v: quad.v2.v,
            };
            let sv3 = ScreenVertex {
                x: center_x + v3.x * scale,
                y: center_y - v3.y * scale,
                z: v3.z,
                u: quad.v3.u,
                v: quad.v3.v,
            };

            rasterize_triangle(&sv0, &sv1, &sv2, &self.skin, shade, width, height, &mut pixels, &mut z_buffer);
            rasterize_triangle(&sv0, &sv2, &sv3, &self.skin, shade, width, height, &mut pixels, &mut z_buffer);
        }

        pixels
    }
}

fn add_cuboid(
    quads: &mut Vec<Quad>,
    pivot: Vec3,
    rot: Vec3,
    x0: f32, x1: f32,
    y0: f32, y1: f32,
    z0: f32, z1: f32,
    u_origin: f32, v_origin: f32,
    w: f32, h: f32, d: f32,
) {
    // 8 local corners
    let corners = [
        Vec3::new(x0, y0, z0), // 0: ---
        Vec3::new(x1, y0, z0), // 1: +--
        Vec3::new(x1, y1, z0), // 2: ++-
        Vec3::new(x0, y1, z0), // 3: -+-
        Vec3::new(x0, y0, z1), // 4: --+
        Vec3::new(x1, y0, z1), // 5: +-+
        Vec3::new(x1, y1, z1), // 6: +++
        Vec3::new(x0, y1, z1), // 7: -++
    ];

    let mut transformed = [Vec3::new(0.0, 0.0, 0.0); 8];
    for (i, c) in corners.iter().enumerate() {
        let r = rotate_xyz(*c, rot.x, rot.y, rot.z);
        transformed[i] = Vec3::new(r.x + pivot.x, r.y + pivot.y, r.z + pivot.z);
    }

    // Standard Minecraft Skin Box UV Mapping:
    // Front Face (Z+): (u_origin + d, v_origin + d) to (u_origin + d + w, v_origin + d + h)
    quads.push(Quad::new(
        transformed[7], transformed[6], transformed[5], transformed[4],
        (u_origin + d) / 64.0, (v_origin + d) / 64.0,
        (u_origin + d + w) / 64.0, (v_origin + d + h) / 64.0,
    ));

    // Back Face (Z-):
    quads.push(Quad::new(
        transformed[2], transformed[3], transformed[0], transformed[1],
        (u_origin + d + w + d) / 64.0, (v_origin + d) / 64.0,
        (u_origin + d + w + d + w) / 64.0, (v_origin + d + h) / 64.0,
    ));

    // Right Face (X-):
    quads.push(Quad::new(
        transformed[3], transformed[7], transformed[4], transformed[0],
        u_origin / 64.0, (v_origin + d) / 64.0,
        (u_origin + d) / 64.0, (v_origin + d + h) / 64.0,
    ));

    // Left Face (X+):
    quads.push(Quad::new(
        transformed[6], transformed[2], transformed[1], transformed[5],
        (u_origin + d + w) / 64.0, (v_origin + d) / 64.0,
        (u_origin + d + w + d) / 64.0, (v_origin + d + h) / 64.0,
    ));

    // Top Face (Y+):
    quads.push(Quad::new(
        transformed[3], transformed[2], transformed[6], transformed[7],
        (u_origin + d) / 64.0, v_origin / 64.0,
        (u_origin + d + w) / 64.0, (v_origin + d) / 64.0,
    ));

    // Bottom Face (Y-):
    quads.push(Quad::new(
        transformed[4], transformed[5], transformed[1], transformed[0],
        (u_origin + d + w) / 64.0, v_origin / 64.0,
        (u_origin + d + w + w) / 64.0, (v_origin + d) / 64.0,
    ));
}

fn rotate_xyz(v: Vec3, rx: f32, ry: f32, rz: f32) -> Vec3 {
    // Rotation around X
    let y1 = v.y * rx.cos() - v.z * rx.sin();
    let z1 = v.y * rx.sin() + v.z * rx.cos();
    let x1 = v.x;

    // Rotation around Y
    let x2 = x1 * ry.cos() + z1 * ry.sin();
    let z2 = -x1 * ry.sin() + z1 * ry.cos();
    let y2 = y1;

    // Rotation around Z
    let x3 = x2 * rz.cos() - y2 * rz.sin();
    let y3 = x2 * rz.sin() + y2 * rz.cos();
    let z3 = z2;

    Vec3::new(x3, y3, z3)
}

fn transform_view(v: Vec3, yaw: f32, pitch: f32) -> Vec3 {
    // Yaw (Y axis)
    let x1 = v.x * yaw.cos() + v.z * yaw.sin();
    let z1 = -v.x * yaw.sin() + v.z * yaw.cos();
    let y1 = v.y;

    // Pitch (X axis)
    let y2 = y1 * pitch.cos() - z1 * pitch.sin();
    let z2 = y1 * pitch.sin() + z1 * pitch.cos();
    let x2 = x1;

    Vec3::new(x2, y2, z2)
}

fn rasterize_triangle(
    v0: &ScreenVertex,
    v1: &ScreenVertex,
    v2: &ScreenVertex,
    skin: &RgbaImage,
    shade: f32,
    width: u32,
    height: u32,
    pixels: &mut [u8],
    z_buffer: &mut [f32],
) {
    let min_x = (v0.x.min(v1.x).min(v2.x).floor() as i32).max(0);
    let max_x = (v0.x.max(v1.x).max(v2.x).ceil() as i32).min((width - 1) as i32);
    let min_y = (v0.y.min(v1.y).min(v2.y).floor() as i32).max(0);
    let max_y = (v0.y.max(v1.y).max(v2.y).ceil() as i32).min((height - 1) as i32);

    let area = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);
    if area.abs() < 0.001 {
        return;
    }
    let inv_area = 1.0 / area;

    let (skin_w, skin_h) = (skin.width() as f32, skin.height() as f32);

    for y in min_y..=max_y {
        for x in min_x..=max_x {
            let px = x as f32 + 0.5;
            let py = y as f32 + 0.5;

            let w0 = ((v1.x - px) * (v2.y - py) - (v1.y - py) * (v2.x - px)) * inv_area;
            let w1 = ((v2.x - px) * (v0.y - py) - (v2.y - py) * (v0.x - px)) * inv_area;
            let w2 = 1.0 - w0 - w1;

            if w0 >= -0.001 && w1 >= -0.001 && w2 >= -0.001 {
                let z = w0 * v0.z + w1 * v1.z + w2 * v2.z;
                let pixel_idx = (y as u32 * width + x as u32) as usize;

                if z > z_buffer[pixel_idx] {
                    let u = (w0 * v0.u + w1 * v1.u + w2 * v2.u).clamp(0.0, 1.0);
                    let v = (w0 * v0.v + w1 * v1.v + w2 * v2.v).clamp(0.0, 1.0);

                    let tx = ((u * skin_w) as u32).min(skin.width() - 1);
                    let ty = ((v * skin_h) as u32).min(skin.height() - 1);

                    let skin_pixel = skin.get_pixel(tx, ty);
                    if skin_pixel[3] > 20 {
                        z_buffer[pixel_idx] = z;

                        let base = pixel_idx * 4;
                        pixels[base] = ((skin_pixel[0] as f32) * shade).min(255.0) as u8;
                        pixels[base + 1] = ((skin_pixel[1] as f32) * shade).min(255.0) as u8;
                        pixels[base + 2] = ((skin_pixel[2] as f32) * shade).min(255.0) as u8;
                        pixels[base + 3] = skin_pixel[3];
                    }
                }
            }
        }
    }
}
