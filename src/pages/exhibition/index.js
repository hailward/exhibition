import React, { useEffect, useReducer, useRef, useState } from 'react';
import * as three from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import TWEEN from '@tweenjs/tween.js';

const { PI } = Math;

const Exhibition = () => {
  const containerRef = useRef();
  const [inited, setInited] = useState(false);
  const [instances, setInstances] = useReducer((state, newState) => ({ ...state, ...newState }), {});
  const [animations, setAnimations] = useReducer((state, newState) => ({ ...state, ...newState }), {});
  /**
   * 初始化
   */
  useEffect(() => {
    if (inited) return;
    const container = containerRef.current;
    const { offsetWidth, offsetHeight } = container;
    const scene = new three.Scene();
    const camera = new three.PerspectiveCamera(75, offsetWidth / offsetHeight, 0.1, 1000);
    camera.position.set(0, 0, 12);
    camera.rotation.set(PI / 2, 0, 0)
    const renderer = new three.WebGLRenderer({ antialias: true });
    renderer.setSize(offsetWidth, offsetHeight);
    renderer.setClearColor(0x222842, 1);
    container.appendChild(renderer.domElement);
    setInstances({ scene, camera, renderer });
    setInited(true);
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
  }, [inited]);
  const { scene, camera, renderer } = instances;
  /**
   * 监听窗口缩放
   */
  useEffect(() => {
    if (!camera || !renderer) return;
    // resize
    const resize = () => {
      const container = containerRef.current;
      const { offsetWidth, offsetHeight } = container;
      camera.aspect = offsetWidth / offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(offsetWidth, offsetHeight);
    };
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [camera, renderer]);
  /**
   * 添加grid参考和axis参考
   * @deprecated
   */
  useEffect(() => {
    if (!scene || true) return;
    const gridWidth = 100;
    const grid = new three.GridHelper(gridWidth, 10);
    grid.rotation.x = PI / 2;
    scene.add(grid);
    const axes = new three.AxesHelper(gridWidth / 2);
    scene.add(axes);
  }, [scene]);
  /**
   * 添加灯光
   */
  useEffect(() => {
    if (!scene) return;
    const ambientLight = new three.AmbientLight(0xFFFFFF, 0.5);
    scene.add(ambientLight);
    const pointLight = new three.PointLight(0xFFFFFF, 1, 80);
    pointLight.position.set(0, 0, 19);
    scene.add(pointLight);
  }, [scene]);
  /**
   * 添加轨道控制器
   * @deprecated
   */
  useEffect(() => {
    if (!camera || !renderer || true) return;
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    // orbitControls.autoRotate = true;
    // orbitControls.enableDamping = true;
    const animation = () => orbitControls.update();
    setAnimations({ orbitControls: animation });
    setInstances({ orbitControls });
  }, [camera, renderer]);
  /**
   * 添加自定义控制器
   */
  useEffect(() => {
    if (!camera || !renderer) return;
    const { domElement } = renderer;
    const onPointerDown = downEvent => {
      const { offsetWidth, offsetHeight } = domElement;
      const { x, y } = camera.rotation;
      const { offsetX: downX, offsetY: downY } = downEvent;
      const onPointerMove = moveEvent => {
        const { offsetX: moveX, offsetY: moveY } = moveEvent;
        const dy = moveY - downY;
        const rotationX = x + (dy / (offsetHeight / 2) * PI);
        // camera.rotation.x = rotationX;
        const dx = moveX - downX;
        const rotationY = y + (dx / (offsetWidth / 2) * (2 * PI))
        camera.rotation.y = rotationY;
        console.info(rotationX, rotationY);
      }
      const onPointerUp = () => {
        domElement.removeEventListener('pointermove', onPointerMove);
        domElement.removeEventListener('pointerup', onPointerUp);
      }
      domElement.addEventListener('pointermove', onPointerMove);
      domElement.addEventListener('pointerup', onPointerUp);
    }
    domElement.addEventListener('pointerdown', onPointerDown);
    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown);
    }
  }, [camera, renderer])
  /**
   * 添加光线追踪，处理点击事件
   */
  useEffect(() => {
    if (!scene || !camera || !renderer) return;
    const { domElement } = renderer;
    const onPointerDown = downEvent => {
      const { offsetX: downX, offsetY: downY } = downEvent;
      const startTime = Date.now();
      const onPointerUp = upEvent => {
        domElement.removeEventListener('pointerup', onPointerUp);
        const { offsetX: upX, offsetY: upY } = upEvent;
        const endTime = Date.now();
        if (
          Math.abs(downX - upX) > 5 ||
          Math.abs(downY - upY) > 5 ||
          endTime - startTime > 1000
        ) return;
        const { offsetWidth, offsetHeight } = domElement;
        const raycaster = new three.Raycaster();
        const x = (upX / offsetWidth) * 2 - 1;
        const y = -(upY / offsetHeight) * 2 + 1;
        const mouse = new three.Vector2(x, y);
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const [intersect] = intersects;
        if (
          intersect &&
          intersect.object &&
          intersect.object.onClick
        ) {
          intersect.object.onClick(intersect);
        }
      }
      domElement.addEventListener('pointerup', onPointerUp);
    }
    domElement.addEventListener('pointerdown', onPointerDown);
    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown);
    }
  }, [scene, camera, renderer]);
  /**
   * 绘制地板
   */
  useEffect(() => {
    if (!scene || !camera) return;
    const geometry = new three.BoxGeometry(100, 100, 1);
    const material = new three.MeshPhysicalMaterial({ color: 0x333333 });
    const floor = new three.Mesh(geometry, material);
    floor.position.z = -0.5;
    floor.onClick = intersect => {
      // 控制范围，不能离墙过近
      let { x, y } = intersect.point;
      if (Math.abs(x) > 30) x = x > 0 ? 30 : - 30;
      if (Math.abs(y) > 30) y = y > 0 ? 30 : -30;
      new TWEEN.Tween(camera.position)
        .to({ x, y }, 200)
        .interpolation(TWEEN.Interpolation.Bezier)
        .easing(TWEEN.Easing.Linear.None)
        .start();
    };
    scene.add(floor);
  }, [scene, camera]);
  /**
   * 绘制天花板
   */
  useEffect(() => {
    if (!scene || !camera) return;
    const geometry = new three.BoxGeometry(100, 100, 1);
    const material = new three.MeshPhysicalMaterial({ color: 0xFFFFFF });
    const ceiling = new three.Mesh(geometry, material);
    ceiling.position.z = 20 + 0.5;
    scene.add(ceiling);
  }, [scene, camera]);
  /**
   * 绘制墙壁
   */
  useEffect(() => {
    if (!scene || !camera) return;
    /**
     * 创建展品
     * @param {*} path 展品图片路径
     * @param {*} transform 点击展品时设置机位
     * @returns 
     */
    const createExhibit = (path, transform) => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = path;
        image.onload = () => {
          const { width, height } = image;
          const ratioX = width / 16;
          const ratioY = height / 9;
          const ratio = Math.max(ratioX, ratioY);
          const w = width / ratio;
          const h = height / ratio;
          const texture = new three.TextureLoader().load(path);
          const geometry = new three.BoxGeometry(w, h, 0.4);
          const material = [
            new three.MeshPhysicalMaterial({ color: 0xFFFFFF }),
            new three.MeshPhysicalMaterial({ color: 0xFFFFFF }),
            new three.MeshPhysicalMaterial({ color: 0xFFFFFF }),
            new three.MeshPhysicalMaterial({ color: 0xFFFFFF }),
            new three.MeshPhysicalMaterial({ color: 0xFFFFFF }),
            new three.MeshPhysicalMaterial({ map: texture }),
          ];
          const exhibit = new three.Mesh(geometry, material);
          exhibit.position.z = 0.3;
          exhibit.rotation.x = PI / 2;
          exhibit.onClick = () => {
            var box = new three.Box3();
            box.setFromObject(exhibit);
            const { min, max } = box;
            const boxCenter = {
              x: min.x + (max.x - min.x),
              y: min.y + (max.y - min.y),
              z: min.z + (max.z - min.z),
            };
            new TWEEN.Tween(camera.position)
              .to({ x: boxCenter.x + transform.position.x, y: boxCenter.y + transform.position.y }, 500)
              .interpolation(TWEEN.Interpolation.Bezier)
              .easing(TWEEN.Easing.Linear.None)
              .start();
            const getRotation = (source, target) => {
              let maked = source % (PI * 2);
              maked = maked > 0 ? maked : maked + (PI * 2);
              const diff = target - maked;
              // 差值大于180度，需要反方向旋转
              if (Math.abs(diff) > PI) {
                if (diff > 0) {
                  return source + (PI * 2 - diff);
                } else {
                  return source + (PI * 2 + diff);
                }
              } else {
                return source + diff;
              }
            }
            new TWEEN.Tween(camera.rotation)
              .to({ y: getRotation(camera.rotation.y, transform.rotation.y) }, 500)
              .interpolation(TWEEN.Interpolation.Bezier)
              .easing(TWEEN.Easing.Linear.None)
              .start();
          }
          const group = new three.Group();
          group.add(exhibit);
          resolve(group);
        };
        image.onerror = () => reject();
      })
    };
    /**
     * 创建墙壁
     * @param {*} paths 展品图片路径列表
     * @param {*} transform 点击展品时设置机位
     * @returns 
     */
    const createWall = (paths, transform) => {
      const geometry = new three.BoxGeometry(100, 20, 1);
      const material = new three.MeshPhysicalMaterial({ color: 0xDDDDDD });
      const wall = new three.Mesh(geometry, material);
      wall.position.z = 10;
      wall.rotation.x = PI / 2;
      // create group
      const group = new three.Group();
      group.add(wall);
      // add exhibits
      const spacing = 100 / 5;
      const startX = spacing / 2;
      paths.forEach((path, index) => {
        createExhibit(path, transform).then(exhibit => {
          const x = -50 + startX + (spacing * index);
          exhibit.position.set(x, 0.5, 12);
          group.add(exhibit);
        });
      })
      return group;
    };
    // 正面墙
    const wallFront = createWall([
      './exhibits/1-1.jpg',
      './exhibits/1-2.jpg',
      './exhibits/1-3.jpg',
      './exhibits/1-4.jpg',
      './exhibits/1-5.jpg',
    ], {
      position: { x: 0, y: -20 },
      rotation: { y: 0 },
    });
    wallFront.position.set(0, 50, 0);
    wallFront.rotation.set(0, 0, PI);
    // 背面墙
    const wallBack = createWall([
      './exhibits/2-1.jpg',
      './exhibits/2-2.jpg',
      './exhibits/2-3.jpg',
      './exhibits/2-4.jpg',
      './exhibits/2-5.jpg',
    ], {
      position: { x: 0, y: 20 },
      rotation: { y: PI },
    });
    wallBack.position.set(0, -50, 0);
    // 左面墙
    const wallLeft = createWall([
      './exhibits/3-1.jpg',
      './exhibits/3-2.jpg',
      './exhibits/3-3.jpg',
      './exhibits/3-4.jpg',
      './exhibits/3-5.jpg',
    ], {
      position: { x: 20, y: 0 },
      rotation: { y: PI / 2 },
    });
    wallLeft.position.set(-50, 0, 0);
    wallLeft.rotation.set(0, 0, PI / 2 * 3);
    // 右面墙
    const wallRight = createWall([
      './exhibits/4-1.jpg',
      './exhibits/4-2.jpg',
      './exhibits/4-3.jpg',
      './exhibits/4-4.jpg',
      './exhibits/4-5.jpg',
    ], {
      position: { x: -20, y: 0 },
      rotation: { y: PI / 2 * 3 },
    });
    wallRight.position.set(50, 0, 0);
    wallRight.rotation.set(0, 0, PI / 2);
    scene.add(wallFront, wallBack, wallLeft, wallRight);
  }, [scene, camera]);
  /**
   * 渲染场景
   */
  useEffect(() => {
    if (!scene || !camera || !renderer) return;
    let interrupt = false;
    const update = () => {
      if (interrupt) return;
      requestAnimationFrame(update);
      TWEEN.update();
      Object.values(animations).forEach(animation => animation());
      renderer.render(scene, camera);
    };
    update();
    return () => interrupt = true;
  }, [scene, camera, renderer, animations]);
  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
      }}
    />
  )
}

export default Exhibition;