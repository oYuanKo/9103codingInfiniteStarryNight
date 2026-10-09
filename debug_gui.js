
const debugParams = {
  vortexStrength: 4.8,
  vortexRadius: 0.39,
  brushCount: 600,
  noiseScale: 0.006,
  brushSpeed: 1.0
};

function initDebugGUI() {
  // Prevent creating duplicate panels
  if (document.getElementById("debug-gui")) return;

  const panel = document.createElement("details");
  panel.id = "debug-gui";
  panel.open = true;

  Object.assign(panel.style, {
    position: "fixed",
    top: "15px",
    right: "15px",
    width: "260px",
    padding: "15px",
    background: "rgba(10, 20, 40, 0.93)",
    color: "white",
    fontFamily: "Arial, sans-serif",
    fontSize: "13px",
    borderRadius: "10px",
    zIndex: "9999"
  });

  const title = document.createElement("summary");
  title.textContent = "Starry Night - Debug";
  title.style.cursor = "pointer";
  title.style.fontWeight = "bold";
  title.style.marginBottom = "12px";

  panel.appendChild(title);

  const controls = [
    {
      label: "Vortex Strength",
      key: "vortexStrength",
      min: 0, max: 10, step: 0.1
    },
    {
      label: "Vortex Radius",
      key: "vortexRadius",
      min: 0.1, max: 0.65, step: 0.01
    },
    {
      label: "Brush Count",
      key: "brushCount",
      min: 100, max: 1500, step: 50
    },
    {
      label: "Noise Scale",
      key: "noiseScale",
      min: 0.001, max: 0.02, step: 0.001
    },
    {
      label: "Brush Speed",
      key: "brushSpeed",
      min: 0, max: 3, step: 0.1
    }
  ];

  for (const control of controls) {
    const row = document.createElement("div");
    row.style.marginBottom = "14px";

    const label = document.createElement("div");
    label.style.display = "flex";
    label.style.justifyContent = "space-between";
    label.style.marginBottom = "5px";

    const name = document.createElement("span");
    name.textContent = control.label;

    const value = document.createElement("span");
    value.textContent = debugParams[control.key];

    label.appendChild(name);
    label.appendChild(value);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = control.min;
    slider.max = control.max;
    slider.step = control.step;
    slider.value = debugParams[control.key];
    slider.style.width = "100%";
    slider.style.accentColor = "#e5bf75";

    slider.addEventListener("input", () => {
      const newValue = Number(slider.value);

      debugParams[control.key] = newValue;
      value.textContent = newValue;

      // Update the main vortex immediately
      if (
        control.key === "vortexStrength" ||
        control.key === "vortexRadius"
      ) {
        if (vortices.length > 0) {
          vortices[0].strength =
            debugParams.vortexStrength;

          vortices[0].radius =
            min(width, height) *
            debugParams.vortexRadius;
        }
      }

      // Adjust brush count without resetting animation
      if (control.key === "brushCount") {
        resizeBrushStrokes(debugParams.brushCount);
      }
    });

    row.appendChild(label);
    row.appendChild(slider);
    panel.appendChild(row);
  }

  document.body.appendChild(panel);
}
