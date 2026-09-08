import { PreviewScene } from '../renderer/scene';
window.thumbnails.onJob(async (job) => {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 384;
  document.body.replaceChildren(canvas);
  let preview: PreviewScene | undefined;
  try {
    preview = new PreviewScene(canvas, true);
    preview.resize(384, 384);
    await preview.load(job.url);
    preview.render(0);
    window.thumbnails.complete({ token: job.token, data: canvas.toDataURL('image/png') });
  } catch (error) {
    window.thumbnails.complete({
      token: job.token,
      error: String(error)
        .replace(/data:[^"'\s]+/g, '[embedded data]')
        .slice(0, 2000),
    });
  } finally {
    preview?.dispose();
  }
});
window.thumbnails.ready();
