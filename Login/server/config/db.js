const mongoose = require('mongoose');

// Replace with your actual MongoDB URI
const mongoURI = '';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connection established successfully.');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});