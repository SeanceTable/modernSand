# modernSand.js

**Author:** SeanceTable

`modernSand.js` is an interactive, multi-modal particle animation library. It leverages the power of Three.js and HTML5 Canvas to create mesmerizing sand-like effects that can transform into images, 3D models, and text. It's designed to be a captivating visual element for websites and web applications.

---

### **Live Demos**

Check out `modernSand.js` in action on these websites:

* **Main Function Example:** [https://go.quaz.fi//sandfwv2/](https://go.quaz.fi//sandfwv2/)
* **Example PC Building Website:** [https://go.quaz.fi/sandpc1/](https://go.quaz.fi/sandpc1/)
* **Example AI Chat Interface:** [https://quaz.fi/riddlev1/](https://quaz.fi/riddlev1/)

---

### **Features**

* **Multi-Mode Animations:** Seamlessly switch between different animation modes.
    * **Image Mode:** Particles form a shape from a provided PNG image.
    * **3D Model Mode:** Particles assemble into a 3D model loaded from an FBX file.
    * **Hourglass Mode:** A 3D simulation of a rotating hourglass with falling sand.
    * **Text Mode:** Particles arrange themselves to spell out custom text.
* **High-Performance Rendering:** Utilizes Three.js with custom GLSL shaders for smooth, hardware-accelerated 3D animations, ensuring high particle counts without sacrificing performance.
* **Responsive Design:** Automatically adjusts particle count and size for an optimal experience on both desktop and mobile devices.
* **Easy Customization:** Easily configure particle behavior, colors, and content sources directly within the JavaScript file.
* **Interactive Controls:** Comes with pre-styled, glass-like orb buttons for switching between modes.

---

### **How to Use modernSand.js in Your Project**

Follow these steps to integrate `modernSand.js` into your website.

#### **1. HTML Structure**

Set up your `index.html` file. The script works with a single `<canvas>` element for all rendering and a container for the mode-switching buttons. It uses a modern `importmap` to handle Three.js dependencies, which simplifies module loading.

```html
<!DOCTYPE HTML>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your Page Title</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="styles.css">

    <!-- Import Map for Three.js -->
    <script type="importmap">
      {
        "imports": {
          "three": "[https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js](https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js)",
          "FBXLoader": "[https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/FBXLoader.js](https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/FBXLoader.js)"
        }
      }
    </script>

    <!-- The main script -->
    <script type="module" src="./modernSand.js"></script>
</head>
<body>
    <!-- Container for the mode-switching buttons -->
    <div id="star-buttons-container"></div>

    <!-- Container for the canvas element -->
    <div id="canvas-container">
        <canvas id="main-canvas"></canvas>
    </div>
</body>
</html>
```

#### **2. CSS Styling**

The `styles.css` file contains the necessary styles for the buttons, canvas layout, and background. Link it in your `<head>` or adapt the styles to fit your project's design. The glass orb effect for the buttons is defined in `.star-button-css`.

```css
/* Example from styles.css */
#star-buttons-container {
  position: relative;
  z-index: 1000 !important;
  display: flex;
  gap: 1.5rem;
  margin: 2rem 0 1rem 0;
  justify-content: center;
}

#main-canvas {
  background: transparent;
  display: block;
  margin: 0 auto;
}
```

#### **3. JavaScript Configuration**

Most customization happens within `modernSand.js`. Open the file and modify the configuration constants at the top to tailor the experience.

* **Change the Image for 'Image Mode':**
    Update the `EXAMPLE_IMAGE` object with the path to your own image.

    ```javascript
    const EXAMPLE_IMAGE = {
      src: '/images/your-image.png',
      link: '/your/image/link.html', // Optional link
      label: 'Your Image Label'
    };
    ```

* **Change the 3D Model for '3D Model Mode':**
    In the `startFBXModelMode` function, change the path in the `fbxLoader.load()` call to point to your own `.fbx` model file.

    ```javascript
    // Inside startFBXModelMode()
    fbxLoader.load('path/to/your/model.fbx', function (object) {
      // ... rest of the function
    });
    ```

* **Change the Text for 'Text Mode':**
    In the `startTextMode` function, modify the `text` variable. The script will automatically handle line wrapping.

    ```javascript
    // Inside startTextMode()
    let text = IS_MOBILE 
        ? "Your Mobile Text Here"
        : "Your desktop text can be longer, as it will wrap automatically.";
    ```

* **Adjust Particle Density and Size:**
    You can fine-tune the number and size of particles for both mobile and desktop versions at the top of the script.

    ```javascript
    const MOBILE_SAND_COUNT = 500;
    const DESKTOP_SAND_COUNT = 9000;
    const SAND_SIZE_MOBILE = 12;
    const SAND_SIZE_DESKTOP = 3;
    ```

#### **4. Dependencies**

`modernSand.js` relies on a few external libraries.

* **Three.js:** Handled via the `importmap` in `index.html`. No local download is required.
* **jQuery:** The provided project includes `jquery.js` (v1.7.1). Ensure it is present in your project directory or replace it with a CDN link.

---
Enjoy creating beautiful, interactive particle art with `modernSand.js`!
