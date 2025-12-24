// program.js
function initProgram() {
    const program = document.getElementById("program");
    const box = document.querySelector(".program-box");
    const closeBtn = document.getElementById("program-close");

    if (!program || !box || !closeBtn) return;

    closeBtn.addEventListener("click", () => 
    {
        program.classList.add("program-hidden");
    });
}

function showProgram({ 
    title = "Edit PCR Program", 
    data = { HOLD_START_CNT:1, PCR_LOOP_CNT:1, STEP_PCR_CNT:[2], HOLD_END_CNT:1 }, 
    onSave = null 
}) {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        overflowY: "auto"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        minWidth: "350px",
        maxWidth: "90%",
        textAlign: "center",
        fontFamily: "'Noto Serif', serif",
        fontSize: "16px"
    });

    const h2 = document.createElement("h2");
    h2.innerText = title;
    Object.assign(h2.style, {
        margin: "0 0 0 0",
        fontSize: "20px",
        fontWeight: "bold",
        color: "#007bff"
    });
    panel.appendChild(h2);

    const treeContainer = document.createElement("div");
    treeContainer.style = "text-align:left; margin-top:15px;";
    panel.appendChild(treeContainer);

    // --- CSS dùng chung cho tất cả input ---
    const inputStyle = {
        width: "4ch",
        fontSize: "14px",
        textAlign: "center",
        borderRadius: "5px",
    };

    // --- Hold Start ---
    const holdStartDiv = document.createElement("div");

    holdStartDiv.innerHTML = `- Hold Stage : <input type="text">`;
    const holdStartInput = holdStartDiv.querySelector("input");
    holdStartInput.type = "text";
    holdStartInput.inputMode = "numeric"; // gọi bàn phím số trên mobile
    holdStartInput.pattern = "[0-9]*";   // giúp trình duyệt nhận dạng số
    holdStartInput.value = data.HOLD_START_CNT;
    Object.assign(holdStartInput.style, inputStyle);
    holdStartDiv.style.marginBottom = "10px";
    holdStartDiv.style.paddingLeft = "20px";
    treeContainer.appendChild(holdStartDiv);

    // --- PCR Stage ---
    const pcrDiv = document.createElement("div");
    
    pcrDiv.innerHTML = `- PCR Stage : <input type="text">`;
    const pcrInput = pcrDiv.querySelector("input");
    pcrInput.type = "text";
    pcrInput.inputMode = "numeric"; // gọi bàn phím số trên mobile
    pcrInput.pattern = "[0-9]*";   // giúp trình duyệt nhận dạng số
    pcrInput.value = data.PCR_LOOP_CNT;
    Object.assign(pcrInput.style, inputStyle);
    pcrDiv.style.marginBottom = "10px";
    pcrDiv.style.paddingLeft = "20px";
    treeContainer.appendChild(pcrDiv);

    // --- Step Inputs ---
    const stepContainer = document.createElement("div");
    treeContainer.appendChild(stepContainer);
    const stepDivs = [];

    function renderSteps() {
        stepContainer.innerHTML = "";
        stepDivs.length = 0;

        for (let i = 0; i < data.PCR_LOOP_CNT; i++) 
        {
            const div = document.createElement("div");
            div.style = "margin-left:50px; margin-bottom:5px;";
            const steps = data.STEP_PCR_CNT[i] || 2;
            div.innerHTML = `➝  Step in PCR Stage ${i+1}: <input type="text">`;
            const input = div.querySelector("input");
            input.value = steps;
            Object.assign(input.style, inputStyle);
            
            input.inputMode = "numeric";
            input.pattern = "[0-9]*";

            input.addEventListener("input", () => {
                input.value = input.value.replace(/[^0-9]/g, "");
            });
            input.addEventListener("blur", () => {
                let val = parseInt(input.value);
                if (isNaN(val)) val = 2;
                if (val < 2) val = 2;
                if (val > 4) val = 4;
                input.value = val;
            });

            stepContainer.appendChild(div);
            stepDivs.push(div);
        }
    }
    renderSteps();

    // --- Hold End ---
    const holdEndDiv = document.createElement("div");
    holdEndDiv.innerHTML = `- Hold Stage : <input type="text">`;
    const holdEndInput = holdEndDiv.querySelector("input");
    holdEndInput.type = "text";
    holdEndInput.inputMode = "numeric"; // gọi bàn phím số trên mobile
    holdEndInput.pattern = "[0-9]*";   // giúp trình duyệt nhận dạng số

    holdEndInput.value = data.HOLD_END_CNT;
    Object.assign(holdEndInput.style, inputStyle);
    holdEndDiv.style.marginTop = "10px";
    holdEndDiv.style.paddingLeft = "20px"; 
    treeContainer.appendChild(holdEndDiv);

    // --- Buttons ---
    const btnContainer = document.createElement("div");
    btnContainer.style = "margin-top:20px; display:flex; gap:10px; justify-content:center;";

    const btnApply = document.createElement("button");
    btnApply.innerText = "Apply";
    Object.assign(btnApply.style, {
        padding: "8px 30px",
        border: "none",
        fontSize: "16px",
        borderRadius: "6px",
        background: "#28a745",
        color: "#fff",
        fontFamily: "'Noto Serif', serif",
        cursor: "pointer"
    });

    const btnCancel = document.createElement("button");
    btnCancel.innerText = "Cancel";
    Object.assign(btnCancel.style, {
        padding: "8px 30px",
        border: "none",
        fontSize: "16px",
        fontFamily: "'Noto Serif', serif",
        borderRadius: "6px",
        background: "#dc3545",
        color: "#fff",
        cursor: "pointer"
    });

    btnContainer.appendChild(btnApply);
    btnContainer.appendChild(btnCancel);
    panel.appendChild(btnContainer);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // --- Validation chung cho 3 ô ---
    [holdStartInput, holdEndInput, pcrInput].forEach((input) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, "");
        });
        input.addEventListener("blur", () => {
            let val = parseInt(input.value);
            if (isNaN(val)) val = 1;
            if (val < 1) val = 1;
            if (val > 3) val = 3;
            input.value = val;

            if (input === pcrInput) {
                data.PCR_LOOP_CNT = val;
                renderSteps();
            }
        });
    });

    btnCancel.onclick = () => overlay.remove();
    btnApply.onclick = () => {
        data.HOLD_START_CNT = parseInt(holdStartInput.value) || 1;
        data.HOLD_END_CNT = parseInt(holdEndInput.value) || 1;
        data.PCR_LOOP_CNT = parseInt(pcrInput.value) || 1;
        //data.STEP_PCR_CNT = stepDivs.map(div => parseInt(div.querySelector("input").value) || 1);
        
        data.STEP_PCR_CNT = stepDivs.map(div => 
        {
            const val = parseInt(div.querySelector("input").value);
            return isNaN(val) ? 1 : val; // mặc định 2 nếu nhập sai
        });

        if (onSave) onSave(data);
        overlay.remove();
    };

    return { close: () => overlay.remove() };
}
