// app.js
const mongoose = require('mongoose');

// Replace with your actual MongoDB URI (local or hosted)
const mongoURI = 'mongodb+srv://ashutoshthakre2003:OgL6hAjT85gkRYhE@chatrix.3qxilwh.mongodb.net/?retryWrites=true&w=majority&appName=chatrix'; // No username/password

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Sample schema (optional)
const TestSchema = new mongoose.Schema({ name: String });
const TestModel = mongoose.model('Test', TestSchema);

// Sample document insertion (optional)
const test = new TestModel({ name: 'Mongo Works!' });
test.save().then(() => console.log('✔ Test document saved.'));