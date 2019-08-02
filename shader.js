class Shader {
    constructor(holder, options) {

        // shader preset
        const preset = {
            antialias: false,
            depthTest: false,
            mousemove: false,
            autosize: true,
            side: 'front',
            vertex: `
                precision highp float;

                attribute vec4 a_position;
                attribute vec4 a_color;

                uniform float u_time;
                uniform vec2 u_resolution;
                uniform vec2 u_mousemove;
                uniform mat4 u_projection;

                varing vec4 v_color;

                void main() {
                    gl_Position = u_projecttion * a_postion;
                    gl_PointSize = (10.0 / gl_Position.w) * 100.0;
                }
            `,
            fragment: `
                precision highp float;

                uniform sampler2D u_texture;
                uniform int u_hasTexture;

                varing vec4 v_color;
                void main() {
                    if (u_hasTexture == 1) {
                        gl_FragColor = v_color * texture2D(u_texture, gl_PointCoord);
                    } else {
                        gl_FragColor = v_color;
                    }
                }
            `,
            uniforms: {},
            buffers: {},
            camera: {},
            texture: {},
            onResize: () => {},
            onUpdate: () => {},
        }

        options = Object.assign(preset, options);

        const uniforms = Object.assign({
            time: { type: 'float', value: 0 },
            hasTexture: { type: 'int', value: 0 },
            resolution: { type: 'vec2', value: [0, 0] },
            mousemove: { type: 'vec2', value: [0, 0] },
            projection: { type: 'mat4', value: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }, 
        }, options.uniforms);

        const buffers = Object.assign({
            position: { size: 3, data: [] },
            color: { size: 4, data: [] },
        }, options.buffers);

        const camera = Object.assign({
            fov: 60,
            near: 1,
            far: 10000,
            aspect: 1,
            z: 100,
            perspective: true,
        }, options.camera);

        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl', { antialias: options.antialias });

        if (!gl) {
            return false;
        }

        this.count = 0;
        this.gl = gl;
        this.camera = camera;
        this.canvas = canvas;
        this.holder = holder;
        this.onResize = options.onResize;
        this.onUpdate = options.onUpdate;
        this.data = {};

        holder.appendChild(canvas);

        this.createProgram(options.vertex, options.fragment);
        this.creatBuffers(buffers);
        this.createUniforms(uniforms);

        this.updateBuffers();
        this.updateUniforms();
        this.createTexture(options.texture);

        gl.enable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl[options.depthTest ? 'enable':'disable'](gl.DEPTH_TEST);
        if (options.autosize) {
            window.addEventListener('resize', e => this.resize(e), false);
        }
        if (options.mousemove) {
            window.addEventListener('mousemove', e => this.mousemove(e), false);
        }

        this.resize();
        this.update = this.update.bind(this);
        this.time = {
            start: performance.now(),
            old: performance.now(),
        }
        this.update();
    }

    mousemove(e) {
        let x = e.pageX / this.width * 2 - 1;
        let y = e.pageY / this.height * 2 - 1;

        this.uniforms.mousemove = [x, y];
    }

    resize(e) {
        const gl = this.gl;
        const canvas = this.canvas;
        const holder = this.holder;

        const width = this.width = holder.offsetWidth;
        const height = this.height = holder.offsetHeight;
        const aspect = this.aspect = width / height;
        const dpi = devicePixelRatio;

        canvas.height = height * dpi;
        canvas.width = width * dpi;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        gl.viewport(0, 0, width * dpi, height * dpi);
        gl.clearColor(0, 0, 0, 0);

        this.uniforms.resolution = [width, height];
        this.uniforms.projection = this.setProjection(aspect);
        this.onResize(width, height, dpi);
    }

    setProjection(aspect) {
        const camera = this.camera;
        
        if (camera.perspective) {
            camera.aspect = aspect;
            const fovRad = camera.fov * (Math.PI / 180);
            const f = Math.tan(0.5 * Math.PI - 0.5 * fovRad);
            const rangeInv = 1.0 / (camera.near - camera.far);

            const matrix = [
                f / camera.aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (camera.near + camera.far) * rangeInv, -1, 
                0, 0, camera.near * camera.far * rangeInv * 2, 0
            ];

            return matrix;
        } else {
            return [
                2 / this.width, 0, 0, 0,
                0, -2 / this.height, 0, 0,
                0, 0, 1, 0,
                -1, 1, 0, 1
            ];
        }
    }

    // link vertex shader and fragment shader
    createProgram(vertex, fragment) {
        const gl = this.gl;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertex);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragment);

        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        // check whether shaders are linked correctly
        if (gl.getProgramParameter(program, gl.LINK_STATUS)){
            gl.useProgram(program);
            this.program = program;
        } else {
            console.log(gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
        }
    }

    // create and compile a shader
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
            return shader;
        } else {
            console.log(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
        }
    }

    createTexture(src) {
        const gl = this.gl;
        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

        this.texture = texture;
        if (src) {
            this.uniforms.hasTexture = 1;
            this.loadTexture(src);
        }
    }

    // load and bind image texture
    loadTexture(src) {
        const gl = this.gl;
        const texture = this.texture;

        const textureImage = new Image();
        textureImage.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        textureImage.src = src;
    }

    createUniforms(data) {
        const uniforms = this.data.uniforms = data;
        const gl = this.gl;
        const values = this.uniforms = {};

        Object.keys(uniforms).forEach(name => {
            const uniform = uniforms[name];
            uniform.location = gl.getUniformLocation(this.program, 'u_' + name);

            Object.defineProperty(values, name, {
                set: value => {
                    uniforms[name].value = value;
                    this.setUniform(name, value);
                },
                get: () => uniforms[name].value,
            })
        })
    }

    setUniform(name, value) {
        const gl = this.gl;
        const uniforms = this.data.uniforms[name];
        uniforms.value = value;

        switch (uniforms.type) {
            case 'int': {
                gl.uniform1i(uniforms.location, value);
                break;
            }
            case 'float': {
                gl.uniform1f(uniforms.location, value);
                break;
            }
            case 'vec2': {
                gl.uniform2f(uniforms.location, ...value);
                break;
            }
            case 'vec3': {
                gl.uniform3f(uniforms.location, ...value);
                break;
            }
            case 'vec4': {
                gl.uniform4f(uniforms.location, ...value);
                break;
            }
            case 'mat2': {
                gl.uniformMatrix2fv(uniforms.location, false, value);
                break;
            }
            case 'mat3': {
                gl.uniformMatrix3fv(uniforms.location, false, value);
                break;
            }
            case 'mat4': {
                gl.uniformMatrix4fv(uniforms.location, false, value);
                break;
            }
        }
    }

    updateUniforms() {
        const gl = this.gl;
        const uniforms = this.data.uniforms;
        Object.keys(uniforms).forEach(name => {
            this.uniforms[name] = uniforms[name].value;
        });
    }

    creatBuffers(data) {
        const buffers = this.data.buffers = data;
        const gl = this.gl;
        const values = this.buffers = {};

        Object.keys(buffers).forEach(name => {
            const buffer = buffers[name];
            buffer.buffer = this.createBuffer('a_' + name, buffer.size);
            Object.defineProperty(values, name, {
                set: data => {
                    buffers[name].data = data;
                    this.setBuffer(name, data);
                    if (name == 'position') {
                        this.count = buffers.position.data.length / 3;
                    }
                },
                get: () => buffers[name].data,
            })
        });
    }

    createBuffer(name, size) {
        const gl = this.gl;
        const program = this.program;

        const index = gl.getAttribLocation(program, name);
        const buffer = gl.createBuffer();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(index);
        gl.vertexAttribPointer(index, size, gl.FLOAT, false, 0, 0);

        return buffer;
    }

    setBuffer(name, data) {
        const gl = this.gl;
        const buffers = this.data.buffers;

        if (name == null && !gl.bindBuffer(gl.ARRAY_BUFFER, null)) { return }

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name].buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    }

    updateBuffers() {
        const gl = this.gl;
        const buffers = this.buffers;

        Object.keys(buffers).forEach(name => {
            buffers[name] = buffer.data;
        });

        this.setBuffer(null)
    }

    update() {
        const gl = this.gl;
        
        const now = performance.now();
        const elapsed = (now - this.time.start) / 5000;
        const delta = now - this.time.old;
        this.time.old = now;

        this.uniforms.time = elapsed;

        if (this.count > 0) {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, this.count);
        }

        this.onUpdate(delta);
        requestAnimationFrame(this.update);

    }




}