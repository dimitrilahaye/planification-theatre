export default {
  root: '.',
  publicDir: 'public',
  server: { port: 3765 },
  // Base pour GitHub Pages : https://<user>.github.io/<repo>/
  base:
    process.env.GITHUB_REPOSITORY != null
      ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
      : '/',
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
};
