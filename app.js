(() => {
  'use strict';

  const instruments = window.LCDA_INSTRUMENTS;
  const RESPONSE_VALUES = [1, 2, 3, 4, 5, 6, 7];
  const TOTAL_QUANT = 35;
  const ids = { quant: null, qual: null };

  function newCode() {
    const bytes = new Uint8Array(4);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    const digits = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 6);
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10).replaceAll('-', '');
    return `LCDA-${local}-${digits}`;
  }

  function makeHeading(title, className = 'group-title') {
    const h = document.createElement('h4');
    h.className = className;
    h.textContent = title;
    return h;
  }

  function renderLikert(containerId, groups, prefix) {
    const container = document.getElementById(containerId);
    groups.forEach(group => {
      container.appendChild(makeHeading(group.title));
      group.questions.forEach(question => {
        const id = String(question.id).padStart(2, '0');
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'likert-question';
        fieldset.dataset.question = `${prefix}_${id}`;
        const legend = document.createElement('legend');
        const number = document.createElement('span');
        number.className = 'qn';
        number.textContent = `${id}.`;
        const prompt = document.createElement('span');
        prompt.textContent = question.text;
        legend.append(number, prompt);
        fieldset.appendChild(legend);
        const choices = document.createElement('div');
        choices.className = 'likert-options';
        RESPONSE_VALUES.forEach(value => {
          const label = document.createElement('label');
          label.className = 'likert-option';
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `${prefix}_${id}`;
          radio.value = String(value);
          radio.setAttribute('aria-label', `${value} de 7`);
          const span = document.createElement('span');
          span.textContent = String(value);
          label.append(radio, span);
          choices.appendChild(label);
        });
        fieldset.appendChild(choices);
        container.appendChild(fieldset);
      });
    });
  }

  function renderInterview() {
    const container = document.getElementById('entrevista-questions');
    instruments.entrevista.forEach(group => {
      container.appendChild(makeHeading(group.title));
      group.questions.forEach(question => {
        const id = String(question.id).padStart(2, '0');
        const div = document.createElement('div');
        div.className = 'interview-item';
        const label = document.createElement('label');
        label.htmlFor = `q_${id}`;
        const number = document.createElement('span');
        number.className = 'qn';
        number.textContent = `${id}.`;
        label.appendChild(number);
        label.appendChild(document.createTextNode(question.text));
        const area = document.createElement('textarea');
        area.name = `q_${id}`;
        area.id = `q_${id}`;
        area.rows = 3;
        area.maxLength = 4500;
        area.placeholder = 'Escribe las palabras de la persona entrevistada. Puede omitir esta pregunta.';
        div.append(label, area);
        container.appendChild(div);
      });
    });
  }

  function setTab(target) {
    for (const type of ['quant', 'qual']) {
      const active = target === type;
      const tab = document.getElementById(`tab-${type}`);
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(`panel-${type}`).hidden = !active;
    }
    if (location.hash !== `#${target}`) {
      try { history.replaceState(null, '', `#${target}`); } catch (e) { /* vista incrustada o file:// */ }
    }
  }

  function initTabs() {
    const tabs = [...document.querySelectorAll('[role="tab"][data-target]')];
    tabs.forEach(tab => {
      tab.addEventListener('click', () => setTab(tab.dataset.target));
      tab.addEventListener('keydown', ev => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
        ev.preventDefault();
        const next = ev.key === 'Home' ? 0 : ev.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (ev.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus();
        setTab(tabs[next].dataset.target);
      });
    });
    setTab(location.hash === '#qual' ? 'qual' : 'quant');
  }

  function updateQuantProgress() {
    const answered = document.querySelectorAll('#quant-form .likert-question input:checked').length;
    document.getElementById('quant-progress-text').textContent = `${answered} de ${TOTAL_QUANT} afirmaciones respondidas`;
    document.getElementById('quant-progress-bar').style.width = `${(answered / TOTAL_QUANT) * 100}%`;
  }

  function updateInterviewProgress() {
    const filled = [...document.querySelectorAll('#entrevista-questions textarea')].filter(t => t.value.trim()).length;
    document.getElementById('qual-progress-text').textContent = `${filled} de 12 preguntas con anotaciones`;
  }

  function showStatus(type, message, kind) {
    const status = document.getElementById(`${type}-status`);
    status.className = `status is-${kind}`;
    status.textContent = message;
    return status;
  }

  function makeNewEntryButton(type, status) {
    const newButton = document.createElement('button');
    newButton.type = 'button';
    newButton.className = 'submit-button';
    newButton.style.marginTop = '12px';
    newButton.textContent = 'Iniciar un nuevo registro';
    newButton.addEventListener('click', () => {
      document.getElementById(`${type}-form`).reset();
      ids[type] = null;
      const code = newCode();
      if (type === 'quant') {
        document.getElementById('quant-code').value = code;
        document.getElementById('qual-code').value = code;
        document.getElementById('other-garment-wrap').classList.add('is-hidden');
        document.getElementById('other-garment').required = false;
        updateQuantProgress();
      } else {
        document.getElementById('qual-code').value = code;
        updateInterviewProgress();
        initDate();
      }
      status.className = 'status';
      status.textContent = '';
      document.getElementById(`${type}-submit`).disabled = false;
      document.getElementById(`panel-${type}`).scrollIntoView({ behavior: 'smooth' });
    });
    status.appendChild(document.createElement('br'));
    status.appendChild(newButton);
    if (type === 'quant') {
      const follow = document.createElement('button');
      follow.type = 'button';
      follow.className = 'submit-button';
      follow.style.margin = '12px 0 0 10px';
      follow.textContent = 'Continuar con la entrevista (mismo código)';
      follow.addEventListener('click', () => {
        document.getElementById('qual-code').value = document.getElementById('quant-code').value;
        setTab('qual');
        document.getElementById('panel-qual').scrollIntoView({ behavior: 'smooth' });
      });
      status.appendChild(follow);
    }
  }

  function validateScales() {
    const firstMissing = [...document.querySelectorAll('#quant-form .likert-question')].find(fieldset => {
      const hasSelected = Boolean(fieldset.querySelector('input:checked'));
      fieldset.classList.toggle('is-incomplete', !hasSelected);
      return !hasSelected;
    });
    if (firstMissing) {
      firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstMissing.querySelector('input').focus({ preventScroll: true });
      showStatus('quant', 'Responde las 35 afirmaciones; falta al menos una opción.', 'error');
      return false;
    }
    return true;
  }

  // Envío mediante formulario/iframe: evita problemas de CORS de GitHub Pages con Apps Script.
  // Solo se considera guardado cuando Apps Script devuelve un mensaje con el identificador de envío.
  function sendToAppsScript(payload) {
    const url = String(window.LCDA_CONFIG?.appsScriptUrl || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec(?:\?.*)?$/.test(url)) {
      return Promise.reject(new Error('La página todavía no está conectada. Configura la URL /exec en config.js antes de recopilar respuestas.'));
    }
    return new Promise((resolve, reject) => {
      const uniqueName = `lcda_frame_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const iframe = document.createElement('iframe');
      iframe.name = uniqueName;
      iframe.title = 'Respuesta de guardado de encuesta';
      iframe.style.display = 'none';
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      form.target = uniqueName;
      form.acceptCharset = 'UTF-8';
      form.style.display = 'none';
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = 'payload';
      hiddenInput.value = JSON.stringify(payload);
      form.appendChild(hiddenInput);
      let settled = false;
      let timeoutId;
      function cleanup() {
        clearTimeout(timeoutId);
        window.removeEventListener('message', onMessage);
        form.remove();
        // Esperar a que finalice el mensaje antes de retirar el iframe.
        setTimeout(() => iframe.remove(), 100);
      }
      function onMessage(event) {
        const data = event.data;
        if (!data || typeof data !== 'object' || data.app !== 'LA_CASA_DEL_ABRIGO' || data.id !== payload.id_envio) return;
        // El ID aleatorio, generado por el navegador, asocia el acuse a esta solicitud.
        if (settled) return;
        settled = true;
        cleanup();
        if (data.ok === true) resolve(data);
        else reject(new Error(data.error || 'No se pudo guardar la respuesta en Google Sheets.'));
      }
      window.addEventListener('message', onMessage);
      timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('No se pudo confirmar el guardado. Revisa Google Sheets antes de reintentar; si reintentas, se reutilizará el mismo identificador para evitar duplicados.'));
      }, 35000);
      document.body.append(iframe, form);
      form.submit();
    });
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  function collectQuant(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const respuestas = {};
    for (let i = 1; i <= 19; i++) {
      const id = `vp_${String(i).padStart(2, '0')}`;
      respuestas[id] = Number(values[id]);
    }
    for (let i = 1; i <= 16; i++) {
      const id = `pp_${String(i).padStart(2, '0')}`;
      respuestas[id] = Number(values[id]);
    }
    return {
      tipo: 'cuantitativo', id_envio: ids.quant ?? (ids.quant = uuid()),
      codigo: String(values.codigo || '').trim(),
      edad: values.edad || '',
      relacion_tienda: values.relacion_tienda || '',
      prenda_evaluada: values.prenda_evaluada || '',
      otra_prenda: values.otra_prenda || '',
      precio_visible_pen: Number(values.precio_visible_pen),
      uso_prenda: values.uso_prenda || '',
      interes_compra: values.interes_compra || '',
      consentimiento: values.consentimiento === 'si',
      respuestas
    };
  }

  function collectQual(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const respuestas = {};
    for (let i = 1; i <= 12; i++) {
      const id = `q_${String(i).padStart(2, '0')}`;
      respuestas[id] = String(values[id] || '').trim();
    }
    return {
      tipo: 'cualitativo', id_envio: ids.qual ?? (ids.qual = uuid()),
      consentimiento: values.consentimiento === 'si',
      codigo: String(values.codigo || '').trim(),
      autoriza_audio: values.autoriza_audio || '',
      registro_notas: values.registro_notas || '',
      fecha_entrevista: values.fecha_entrevista || '',
      modalidad: values.modalidad || '',
      entrevistador_codigo: values.entrevistador_codigo || '',
      hora_inicio: values.hora_inicio || '',
      hora_fin: values.hora_fin || '',
      prenda_referencia: values.prenda_referencia || '',
      frecuencia_compra: values.frecuencia_compra || '',
      experiencia_reciente: values.experiencia_reciente || '',
      observaciones_contexto: values.observaciones_contexto || '',
      informacion_adicional: values.informacion_adicional || '',
      respuestas
    };
  }

  function initDate() {
    const now = new Date();
    document.getElementById('qual-date').value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function initForms() {
    const code = newCode();
    document.getElementById('quant-code').value = code;
    document.getElementById('qual-code').value = code;
    initDate();
    const typeSelect = document.getElementById('garment-type');
    typeSelect.addEventListener('change', () => {
      const isOther = typeSelect.value === 'Otro';
      document.getElementById('other-garment-wrap').classList.toggle('is-hidden', !isOther);
      document.getElementById('other-garment').required = isOther;
    });

    const quantForm = document.getElementById('quant-form');
    quantForm.addEventListener('change', ev => {
      if (ev.target.matches('input[type="radio"]')) {
        ev.target.closest('.likert-question')?.classList.remove('is-incomplete');
        updateQuantProgress();
      }
    });
    quantForm.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (!quantForm.reportValidity()) {
        showStatus('quant', 'Completa los datos requeridos y confirma tu participación.', 'error');
        return;
      }
      if (!validateScales()) return;
      const button = document.getElementById('quant-submit');
      button.disabled = true;
      showStatus('quant', 'Enviando... No cierres esta pestaña.', 'working');
      try {
        const result = await sendToAppsScript(collectQuant(quantForm));
        const status = showStatus('quant', result.duplicado ? 'Esta encuesta ya estaba registrada en Google Sheets. No se creó un duplicado.' : '¡Gracias! La encuesta se guardó correctamente en Google Sheets.', 'success');
        makeNewEntryButton('quant', status);
      } catch (error) {
        showStatus('quant', error.message || 'Error al guardar.', 'error');
        button.disabled = false;
      }
    });

    const qualForm = document.getElementById('qual-form');
    qualForm.addEventListener('input', ev => { if (ev.target.matches('#entrevista-questions textarea')) updateInterviewProgress(); });
    qualForm.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (!qualForm.reportValidity()) {
        showStatus('qual', 'Completa los datos requeridos y registra el consentimiento.', 'error');
        return;
      }
      const answerCount = [...qualForm.querySelectorAll('#entrevista-questions textarea')].filter(el => el.value.trim()).length;
      if (!answerCount) {
        showStatus('qual', 'Registra al menos una respuesta abierta. Las demás preguntas pueden omitirse.', 'error');
        qualForm.querySelector('#entrevista-questions textarea').focus();
        return;
      }
      const button = document.getElementById('qual-submit');
      button.disabled = true;
      showStatus('qual', 'Guardando entrevista... No cierres esta pestaña.', 'working');
      try {
        const result = await sendToAppsScript(collectQual(qualForm));
        const status = showStatus('qual', result.duplicado ? 'Esta entrevista ya estaba registrada. No se creó un duplicado.' : '¡Registro guardado! La entrevista se agregó a Google Sheets.', 'success');
        makeNewEntryButton('qual', status);
      } catch (error) {
        showStatus('qual', error.message || 'Error al guardar.', 'error');
        button.disabled = false;
      }
    });
  }

  renderLikert('perval-questions', instruments.perval, 'vp');
  renderLikert('precio-questions', instruments.precio, 'pp');
  renderInterview();
  initTabs();
  initForms();
  document.getElementById('footer-year').textContent = new Date().getFullYear();
})();
