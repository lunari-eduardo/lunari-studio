// utils para notificações visuais e sonoras (Fase 9)

const NOTIFICATION_SOUND_URL = '/sounds/whatsapp_notification.mp3';

let audioContext: AudioContext | null = null;
let notificationBuffer: AudioBuffer | null = null;

// Preload sound
export async function initAudio() {
  if (typeof window === 'undefined') return;
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const response = await fetch(NOTIFICATION_SOUND_URL);
    if (!response.ok) return;
    const arrayBuffer = await response.arrayBuffer();
    notificationBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('Erro ao carregar som de notificação:', e);
  }
}

export function playNotificationSound() {
  try {
    if (!audioContext || !notificationBuffer) return;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    const source = audioContext.createBufferSource();
    source.buffer = notificationBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (e) {
    console.warn('Erro ao reproduzir som:', e);
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function showBrowserNotification(title: string, body?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // Só mostrar push notification se a aba não estiver com foco
  if (document.visibilityState === 'visible') return;

  try {
    const notification = new Notification(title, {
      body: body ?? 'Nova mensagem',
      icon: '/favicon.ico',
      silent: true, // Já tocamos o som customizado
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn('Erro ao disparar push notification:', e);
  }
}
