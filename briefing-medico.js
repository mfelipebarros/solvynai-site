const TOTAL_STEPS = 9;
let currentStep = 1;
const answers = {};

const steps = document.querySelectorAll('.briefing-step');
const thankyou = document.getElementById('briefingThankyou');
const stepCurrentNum = document.getElementById('stepCurrentNum');

function updateProgress() {
    stepCurrentNum.textContent = String(currentStep).padStart(2, '0');
}

function saveAnswer() {
    const active = document.querySelector('.briefing-step.active');
    const ta = active?.querySelector('.briefing-textarea');
    if (ta) answers[`step${currentStep}`] = ta.value;
}

function animateOut(el, dir, cb) {
    gsap.to(el, {
        opacity: 0,
        x: dir === 'left' ? -50 : 50,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: cb
    });
}

function animateIn(el, fromDir) {
    gsap.fromTo(el,
        { opacity: 0, x: fromDir === 'right' ? 50 : -50 },
        { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
    );
}

function showStep(index, fromDir) {
    steps.forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    const target = steps[index - 1];
    target.style.display = 'flex';
    target.classList.add('active');

    const savedAnswer = answers[`step${index}`];
    const ta = target.querySelector('.briefing-textarea');
    if (ta && savedAnswer !== undefined) ta.value = savedAnswer;

    updateProgress();
    animateIn(target, fromDir || 'right');
}

function nextStep() {
    saveAnswer();
    if (currentStep >= TOTAL_STEPS) {
        submitBriefing();
        return;
    }
    const active = document.querySelector('.briefing-step.active');
    const next = currentStep + 1;
    animateOut(active, 'left', () => {
        active.style.display = 'none';
        active.classList.remove('active');
        currentStep = next;
        showStep(currentStep, 'right');
    });
}

function prevStep() {
    if (currentStep <= 1) return;
    saveAnswer();
    const active = document.querySelector('.briefing-step.active');
    const prev = currentStep - 1;
    animateOut(active, 'right', () => {
        active.style.display = 'none';
        active.classList.remove('active');
        currentStep = prev;
        showStep(currentStep, 'left');
    });
}

const WEBHOOK_URL = 'https://dashboard-n8n.ibvkkl.easypanel.host/webhook/62ac2b8f-3477-4818-87f9-5e6997fa6386';

function showThankyou() {
    thankyou.style.display = 'flex';
    stepCurrentNum.textContent = String(TOTAL_STEPS).padStart(2, '0');
    gsap.fromTo(thankyou,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
}

async function submitBriefing() {
    saveAnswer();

    const submitBtn = document.querySelector('.briefing-submit-btn');
    if (submitBtn) {
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;
    }

    const payload = {
        tipo: 'briefing-medico',
        timestamp: new Date().toISOString(),
        origem: window.location.href,
        respostas: {
            identidade_posicionamento: {
                como_quer_ser_lembrado: answers.step1 || '',
                diferenciais: answers.step2 || '',
                frase_do_servico: answers.step3 || '',
            },
            publico: {
                paciente_ideal: answers.step4 || '',
                tipo_atendimento: answers.step5 || '',
                medicos_encaminhadores: answers.step6 || '',
            },
            rosto_e_autoridade: {
                fotos_disponiveis: answers.step7 || '',
                depoimentos: answers.step8 || '',
                formacoes_certificacoes: answers.step9 || '',
            }
        }
    };

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Webhook error:', err);
    }

    const active = document.querySelector('.briefing-step.active');
    animateOut(active, 'left', () => {
        active.style.display = 'none';
        active.classList.remove('active');
        showThankyou();
    });
}

function initNextButtons() {
    steps.forEach(step => {
        const btn = step.querySelector('.briefing-next-btn');
        if (btn) btn.addEventListener('click', nextStep);
    });
}

function initEntrance() {
    const active = document.querySelector('.briefing-step.active');
    if (!active) return;
    gsap.fromTo(active,
        { opacity: 0, x: 40 },
        { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out', delay: 0.15 }
    );
}

function init() {
    document.getElementById('stepTotalNum').textContent = String(TOTAL_STEPS).padStart(2, '0');
    updateProgress();
    initNextButtons();
    initEntrance();
}

document.addEventListener('DOMContentLoaded', init);
