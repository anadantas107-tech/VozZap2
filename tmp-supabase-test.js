const url = 'https://sljlkpjikvlcooyzmuxt.supabase.co/auth/v1/signup';
const body = JSON.stringify({
  email: 'test@example.com',
  password: 'Password123!',
  options: {
    data: { name: 'Test', avatar_url: null },
  },
});

fetch(url, {
  method: 'POST',
  headers: {
    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsamxrcGppa3ZsY29veXptdXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTYxMjcsImV4cCI6MjA5ODA3MjEyN30.29sp_hx5DFKZuii3eucOCMiTuIC98vX5wbp1vBso9LU',
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsamxrcGppa3ZsY29veXptdXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTYxMjcsImV4cCI6MjA5ODA3MjEyN30.29sp_hx5DFKZuii3eucOCMiTuIC98vX5wbp1vBso9LU',
    'Content-Type': 'application/json',
  },
  body,
})
  .then(async (res) => {
    console.log('STATUS', res.status);
    console.log('TEXT', await res.text());
  })
  .catch((err) => {
    console.error('ERROR', err);
  });