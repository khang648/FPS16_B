async function initPopup() {
    const res = await fetch('/Elements/Popup/Popup.html');
    const html = await res.text();
    document.body.insertAdjacentHTML('beforeend', html);

    // Lấy các element sau khi chèn vào DOM
    window.popupOverlay = document.getElementById('popupOverlay');
    window.popupText = document.getElementById('popupText');
    window.popupIcon = document.getElementById('popupIcon');
    // window.btnYes = document.getElementById('popupYes');
    // window.btnNo = document.getElementById('popupNo');
    // window.btnOk = document.getElementById('popupOk');

    // Ẩn tất cả nút ban đầu
    // btnYes.classList.add('hidden');
    // btnNo.classList.add('hidden');
    // btnOk.classList.add('hidden');
    popupOverlay.classList.add('hidden');
    popupIcon.className = 'popup-icon';
    popupIcon.textContent = '';
}

function showPopup(type, text) {
    // Reset trạng thái
    popupText.textContent = text || '';
    popupIcon.className = 'popup-icon';
    popupIcon.textContent = '';
    // btnYes.classList.add('hidden');
    // btnNo.classList.add('hidden');
    // btnOk.classList.add('hidden');

    // Thêm blur toàn bộ nội dung
    document.body.classList.add('popup-active');

    // Hiển thị popup
    popupOverlay.classList.remove('hidden');

    if(type === 'alert') {
        // popupIcon.textContent = '⚠️';
        // btnOk.classList.remove('hidden');
        // return new Promise(resolve => {
        //     btnOk.onclick = () => {
        //         hidePopup();
        //         resolve();
        //     };
        // });
    } 
    else if(type === 'confirm') {
        // popupIcon.textContent = '❓';
        // btnYes.classList.remove('hidden');
        // btnNo.classList.remove('hidden');
        // return new Promise(resolve => {
        //     btnYes.onclick = () => { hidePopup(); resolve(true); };
        //     btnNo.onclick = () => { hidePopup(); resolve(false); };
        // });
    } 
    else if(type === 'loading') {
        popupIcon.classList.add('loading'); // thêm vòng xoay
        return;
    }
}

function hidePopup() {
    popupOverlay.classList.add('hidden');
    popupIcon.className = 'popup-icon';
    popupIcon.textContent = '';
    popupText.textContent = '';
    // Ẩn tất cả nút
    // btnYes.classList.add('hidden');
    // btnNo.classList.add('hidden');
    // btnOk.classList.add('hidden');

    document.body.classList.remove('popup-active');
}

initPopup();
