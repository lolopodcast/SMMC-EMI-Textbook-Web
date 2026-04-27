// SMMC-EMI Textbook — Copyright Notice on Right-Click
// Shows a copyright notice when user right-clicks (does NOT prevent right-click)

(function() {
  let modalShownRecently = false;
  
  function showCopyrightModal() {
    if (modalShownRecently) return;
    modalShownRecently = true;
    
    // Show again only after 30 minutes
    setTimeout(() => { modalShownRecently = false; }, 30 * 60 * 1000);

    // Build modal
    const overlay = document.createElement('div');
    overlay.className = 'copyright-overlay';
    overlay.innerHTML = `
      <div class="copyright-modal">
        <h3>© Copyright Notice · 著作權聲明</h3>
        <div class="copyright-body">
          <p><strong>SMMC-EMI Course Textbook</strong></p>
          <p>© 2026 <strong>Prof. Shihmin Lo</strong> (駱世民教授)<br/>
          Department of International Business Studies<br/>
          National Chi Nan University, Taiwan</p>
          <hr/>
          <p>This textbook is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener"><strong>CC BY-NC-SA 4.0</strong></a>.</p>
          <p><strong>You may:</strong> Quote with attribution, share for educational purposes, build upon for non-commercial use.</p>
          <p><strong>You may not:</strong> Republish commercially, sell as part of paid courses, or distort the original meaning.</p>
          <p style="font-size: 0.85em; color: #666; margin-top: 1em;">本書受著作權法保護，歡迎於非商業教學用途引用、分享、改作，請保留作者姓名與來源。商業使用請洽：smlo@ncnu.edu.tw</p>
        </div>
        <button class="copyright-ok" onclick="this.closest('.copyright-overlay').remove()">
          I Understand · 我了解，繼續閱讀
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    
    // Close on overlay click (outside the modal)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    
    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  // Listen for right-click; DO NOT prevent the default right-click menu
  document.addEventListener('contextmenu', (e) => {
    showCopyrightModal();
    // Note: we do NOT call e.preventDefault() — right-click menu still works
  });
})();
