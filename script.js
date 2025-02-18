document.addEventListener("DOMContentLoaded", function () {
    const calculateBtn = document.querySelector(".calculate-btn");
    const inputs = document.querySelectorAll(".input-group input[type='number']");
    const sliders = document.querySelectorAll(".input-group input[type='range']");
    const errorLabel = document.getElementById("error-label");

    // Load Selection Buttons
    const balancedLoadBtn = document.getElementById("balanced-load-btn");
    const unbalancedLoadBtn = document.getElementById("unbalanced-load-btn");

    // Input Sections
    const balancedInputs = document.getElementById("balanced-inputs");
    const unbalancedInputs = document.getElementById("unbalanced-inputs");

    let isBalancedLoad = true; // Default to Balanced Load

    // Function to sync slider with input box
    function syncSliderWithInput(slider, input) {
        slider.addEventListener("input", () => {
            input.value = slider.value;
        });
        input.addEventListener("input", () => {
            slider.value = input.value;
        });
    }

    // Sync all sliders with their corresponding input boxes
    sliders.forEach((slider, index) => {
        syncSliderWithInput(slider, inputs[index]);
    });

    // Load Selection Logic
    balancedLoadBtn.addEventListener("click", () => {
        isBalancedLoad = true;
        balancedLoadBtn.classList.add("active");
        unbalancedLoadBtn.classList.remove("active");
        balancedInputs.style.display = "flex";
        unbalancedInputs.style.display = "none";
    });

    unbalancedLoadBtn.addEventListener("click", () => {
        isBalancedLoad = false;
        unbalancedLoadBtn.classList.add("active");
        balancedLoadBtn.classList.remove("active");
        balancedInputs.style.display = "none";
        unbalancedInputs.style.display = "flex";
    });

    function validateInputs() {
        let valid = true;
        const activeInputs = isBalancedLoad ? balancedInputs.querySelectorAll("input") : unbalancedInputs.querySelectorAll("input");
    
        activeInputs.forEach(input => {
            if (input.value.trim() === "" || isNaN(parseFloat(input.value))) {
                input.classList.add("error");
                valid = false;
            } else {
                input.classList.remove("error");
            }
        });
    
        return valid;
    }
    

    function calculateAndPlot() {
        if (!validateInputs()) {
            errorLabel.textContent = "Error: Please enter valid numbers.";
            return;
        }
        errorLabel.textContent = "";
    
        // Function to clear all previous plots
        function clearPlots() {
            Plotly.purge("voltage-plot");
            Plotly.purge("current-plot");
            Plotly.purge("power-plot");
            Plotly.purge("active-power-plot");
            Plotly.purge("reactive-power-plot");
            Plotly.purge("apparent-power-plot");
            Plotly.purge("power-plot-r");
            Plotly.purge("power-plot-y");
            Plotly.purge("power-plot-b");
        }
    
        // Clear previous plots before generating new ones
        clearPlots();
    
        // Get input values
        const w = parseFloat(document.getElementById("frequency").value);
        const T = 2 * Math.PI / w;
        const t = Array.from({ length: 1000 }, (_, i) => (i / 1000) * 3 * T);
    
        if (isBalancedLoad) {
            // Balanced Load Calculations (unchanged)
            const R = parseFloat(document.getElementById("resistance").value);
            const L = parseFloat(document.getElementById("inductance").value);
            const C = parseFloat(document.getElementById("capacitance").value);
            const V0 = parseFloat(document.getElementById("voltage-amplitude").value);
    
            const Z_R = R;
            const Z_L = w * L;
            const Z_C = C > 0 ? 1 / (w * C) : Infinity;
            const Z_total = Math.sqrt(Z_R ** 2 + (Z_L - Z_C) ** 2);
            const theta = Math.atan((Z_L - Z_C) / Z_R);
    
            const V_r = t.map(time => V0 * Math.sin(w * time));
            const V_y = t.map(time => V0 * Math.sin(w * time + 2 * Math.PI / 3));
            const V_b = t.map(time => V0 * Math.sin(w * time + 4 * Math.PI / 3));
    
            const I_r = t.map(time => (V0 / Z_total) * Math.sin(w * time - theta));
            const I_y = t.map(time => (V0 / Z_total) * Math.sin(w * time + 2 * Math.PI / 3 - theta));
            const I_b = t.map(time => (V0 / Z_total) * Math.sin(w * time + 4 * Math.PI / 3 - theta));
    
            const P_total = t.map((_, i) => V_r[i] * I_r[i] + V_y[i] * I_y[i] + V_b[i] * I_b[i]);
            const Q_total = t.map((_, i) => P_total[i] * Math.tan(theta));
            const S_total = t.map((p, i) => Math.sqrt(p ** 2 + Q_total[i] ** 2));
    
            // Plot Balanced Load (unchanged)
            Plotly.newPlot("voltage-plot", [
                { x: t, y: V_r, mode: "lines", name: "V_R", line: { color: "red" } },
                { x: t, y: V_y, mode: "lines", name: "V_Y", line: { color: "yellow" } },
                { x: t, y: V_b, mode: "lines", name: "V_B", line: { color: "blue" } }
            ], { title: "Phase Voltages (Balanced)", xaxis: { title: "Time (s)" }, yaxis: { title: "Voltage (V)" }});
    
            Plotly.newPlot("current-plot", [
                { x: t, y: I_r, mode: "lines", name: "I_R", line: { color: "red" } },
                { x: t, y: I_y, mode: "lines", name: "I_Y", line: { color: "yellow" } },
                { x: t, y: I_b, mode: "lines", name: "I_B", line: { color: "blue" } }
            ], { 
                title: `Phase Currents (Balanced, φ = ${theta.toFixed(2)} rad)`, 
                xaxis: { title: "Time (s)" }, 
                yaxis: { title: "Current (A)" }
            });
    
            Plotly.newPlot("power-plot", [
                { x: t, y: P_total, mode: "lines", name: "Active Power", line: { color: "orange" } },
                { x: t, y: Q_total, mode: "lines", name: "Reactive Power", line: { color: "purple" } },
                { x: t, y: S_total, mode: "lines", name: "Apparent Power", line: { color: "black" } }
            ], { 
                title: "Power Parameters (Balanced)", 
                xaxis: { title: "Time (s)" }, 
                yaxis: { title: "Power (W)" }
            });
    
        } else {
            // Unbalanced Load Calculations
            const phaseData = ["r", "y", "b"].map(phase => {
                return {
                    R: parseFloat(document.getElementById(`resistance-${phase}`).value),
                    L: parseFloat(document.getElementById(`inductance-${phase}`).value),
                    C: parseFloat(document.getElementById(`capacitance-${phase}`).value),
                    V: parseFloat(document.getElementById(`voltage-${phase}`).value)
                };
            });
    
            const phaseAngles = [0, 2 * Math.PI / 3, 4 * Math.PI / 3];
    
            const voltages = phaseData.map((data, index) =>
                t.map(time => data.V * Math.sin(w * time + phaseAngles[index]))
            );
    
            const impedances = phaseData.map(data => {
                const Z_R = data.R;
                const Z_L = w * data.L;
                const Z_C = data.C > 0 ? 1 / (w * data.C) : Infinity;
                return {
                    Z_total: Math.sqrt(Z_R ** 2 + (Z_L - Z_C) ** 2),
                    theta: Math.atan((Z_L - Z_C) / Z_R)
                };
            });
    
            const currents = impedances.map((imp, index) =>
                t.map(time => (phaseData[index].V / imp.Z_total) * Math.sin(w * time + phaseAngles[index] - imp.theta))
            );
    
            // Calculate Active, Reactive, and Apparent Power for Unbalanced Load
            const activePowers = impedances.map((imp, index) =>
                t.map((_, i) => voltages[index][i] * currents[index][i] * Math.cos(imp.theta))
            );
    
            const reactivePowers = impedances.map((imp, index) =>
                t.map((_, i) => voltages[index][i] * currents[index][i] * Math.sin(imp.theta))
            );
    
            const apparentPowers = impedances.map((imp, index) =>
                t.map((_, i) => voltages[index][i] * currents[index][i])
            );
    
            // Plot Unbalanced Load
            Plotly.newPlot("voltage-plot", [
                { x: t, y: voltages[0], mode: "lines", name: "V_R", line: { color: "red" } },
                { x: t, y: voltages[1], mode: "lines", name: "V_Y", line: { color: "yellow" } },
                { x: t, y: voltages[2], mode: "lines", name: "V_B", line: { color: "blue" } }
            ], { title: "Phase Voltages (Unbalanced)", xaxis: { title: "Time (s)" }, yaxis: { title: "Voltage (V)" }});
    
            Plotly.newPlot("current-plot", [
                { x: t, y: currents[0], mode: "lines", name: "I_R", line: { color: "red" } },
                { x: t, y: currents[1], mode: "lines", name: "I_Y", line: { color: "yellow" } },
                { x: t, y: currents[2], mode: "lines", name: "I_B", line: { color: "blue" } }
            ], { title: "Phase Currents (Unbalanced)", xaxis: { title: "Time (s)" }, yaxis: { title: "Current (A)" }});
    
            // Plot Power Parameters for Unbalanced Load
            Plotly.newPlot("active-power-plot", [
                { x: t, y: activePowers[0], mode: "lines", name: "Active Power (R)", line: { color: "red" } },
                { x: t, y: activePowers[1], mode: "lines", name: "Active Power (Y)", line: { color: "yellow" } },
                { x: t, y: activePowers[2], mode: "lines", name: "Active Power (B)", line: { color: "blue" } }
            ], { title: "Active Power (Unbalanced)", xaxis: { title: "Time (s)" }, yaxis: { title: "Power (W)" }});
    
            Plotly.newPlot("reactive-power-plot", [
                { x: t, y: reactivePowers[0], mode: "lines", name: "Reactive Power (R)", line: { color: "red" } },
                { x: t, y: reactivePowers[1], mode: "lines", name: "Reactive Power (Y)", line: { color: "yellow" } },
                { x: t, y: reactivePowers[2], mode: "lines", name: "Reactive Power (B)", line: { color: "blue" } }
            ], { title: "Reactive Power (Unbalanced)", xaxis: { title: "Time (s)" }, yaxis: { title: "Power (VAR)" }});
    
            Plotly.newPlot("apparent-power-plot", [
                { x: t, y: apparentPowers[0], mode: "lines", name: "Apparent Power (R)", line: { color: "red" } },
                { x: t, y: apparentPowers[1], mode: "lines", name: "Apparent Power (Y)", line: { color: "yellow" } },
                { x: t, y: apparentPowers[2], mode: "lines", name: "Apparent Power (B)", line: { color: "blue" } }
            ], { title: "Apparent Power (Unbalanced)", xaxis: { title: "Time (s)" }, yaxis: { title: "Power (VA)" }});
        }
    }
    

    calculateBtn.addEventListener("click", calculateAndPlot);
    inputs.forEach(input => {
        input.addEventListener("input", () => {
            input.classList.remove("error");
            errorLabel.textContent = "";
        });
    });
});
function resetInputsAndPlots() {
    // Clear all input fields
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.value = "";
    });

    // Reset all sliders to their default values
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.value = slider.defaultValue;
    });

    // Clear all plots
    clearPlots();

    // Clear error message
    errorLabel.textContent = "";
}

function clearPlots() {
    Plotly.purge("voltage-plot");
    Plotly.purge("current-plot");
    Plotly.purge("power-plot");
    Plotly.purge("power-plot-r");
    Plotly.purge("power-plot-y");
    Plotly.purge("power-plot-b");
}

