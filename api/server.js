import app from './index.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`OPS//TERMINAL API running on http://localhost:${PORT}`);
});
