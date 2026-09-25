const status = document.querySelector('#status');
const buttons = [...document.querySelectorAll('button')];
for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('click', async () => {
    buttons.forEach(item => { item.disabled = true; });
    status.classList.remove('error');
    status.textContent = 'Working on your open tabs…';
    try {
      const result = await chrome.runtime.sendMessage({ type: button.dataset.action });
      if (!result?.ok) throw new Error(result?.error || 'No response. Reload the extension and try again.');
      const counts = result.counts;
      status.textContent = button.dataset.action === 'order'
        ? 'Done. Matching groups are in rule order.'
        : `Done · ${counts.grouped || 0} grouped · ${counts.recoloured || 0} recoloured · ${counts.ungrouped || 0} ungrouped · ${counts.protected || 0} protected · ${counts.failed || 0} failed`;
      status.classList.toggle('error', Boolean(counts.failed));
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('error');
    } finally { buttons.forEach(item => { item.disabled = false; }); }
  });
}
document.querySelector('#settings').addEventListener('click', async () => {
  try { await chrome.runtime.openOptionsPage(); window.close(); }
  catch (error) { status.textContent = error.message; status.classList.add('error'); }
});
