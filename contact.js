const discordCopyButton = document.querySelector('[data-copy-discord]');
const discordCopyStatus = document.querySelector('.discord-copy-status');

async function copyDiscordHandle() {
  const handle = 'nnegocioss';
  let copied = false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(handle);
      copied = true;
    }
  } catch {
    // Use the compatibility fallback below when clipboard access is unavailable.
  }

  if (!copied) {
    const input = document.createElement('textarea');
    input.value = handle;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    copied = document.execCommand('copy');
    input.remove();
  }

  if (discordCopyStatus) discordCopyStatus.textContent = copied ? 'Usuario de Discord copiado.' : 'Mi usuario es nnegocioss.';
  if (discordCopyButton) {
    discordCopyButton.textContent = copied ? 'Copiado' : '@nnegocioss';
    window.setTimeout(() => { discordCopyButton.textContent = 'Copiar'; }, 1800);
  }
}

discordCopyButton?.addEventListener('click', copyDiscordHandle);
