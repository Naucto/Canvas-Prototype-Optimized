// PixiCanvas.tsx
import React, { useEffect, useRef } from 'react';
import {
  Application,
  Assets,
  Sprite,
  Graphics,
  TextureStyle,
  RenderTexture,
} from 'pixi.js';

TextureStyle.defaultOptions.scaleMode = 'nearest';

export default function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new Application();

    (async () => {
      await app.init({
        width: 320,
        height: 180,
        background: '#1099bb',
        resolution: 1,
        autoDensity: false,
      });


      containerRef.current.appendChild(app.canvas);
      app.canvas.style.imageRendering = 'pixelated';
      app.canvas.style.width  = '640px';
      app.canvas.style.height = '360px';

      const gfx = new Graphics();
      gfx.fill(0xff0000);
      gfx.rect(50, 50, 100, 100);
      app.stage.addChild(gfx);

      const tex   = await Assets.load('https://pixijs.io/examples/examples/assets/bunny.png');
      const framebuffer = RenderTexture.create({
        width: 320,
        height: 180,
        scaleMode: 'nearest',
        resolution: 1,
      });
      const bunny = new Sprite(tex);
      bunny.anchor.set(0.5);
      bunny.x = app.screen.width  / 2;
      bunny.y = app.screen.height / 2;
      
      app.renderer.render(bunny);
      app.ticker.add(() => {
        bunny.rotation += 0.01;
      });
    })();

    return () => {
      app.destroy(true, true);
    };
  }, []);

  return <div ref={containerRef} />;
}
