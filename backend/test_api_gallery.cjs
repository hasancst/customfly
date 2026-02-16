async function testGalleryAPI() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3011/imcst_api/public/assets?shop=uploadfly-lab.myshopify.com&type=gallery');
    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text (first 500):', text.substring(0, 500));
    
    const data = JSON.parse(text);
    
    console.log('API Response type:', typeof data);
    console.log('Is array?', Array.isArray(data));
    
    if (!Array.isArray(data)) {
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
      return;
    }
    
    const gallery = data.find(a => a.name === 'Customfly Photo Gallery');
    
    if (gallery) {
      console.log('Gallery found!');
      console.log('ID:', gallery.id);
      console.log('Type:', gallery.type);
      console.log('Value length:', gallery.value.length);
      console.log('\nValue (first 500 chars):');
      console.log(gallery.value.substring(0, 500));
      
      // Parse items
      const lines = gallery.value.split('\n').filter(Boolean);
      console.log('\nTotal items:', lines.length);
      console.log('\nFirst 3 parsed items:');
      lines.slice(0, 3).forEach((line, i) => {
        const parts = line.split('|');
        console.log(`  ${i+1}. Name: "${parts[0]}", URL: "${parts[1]}"`);
      });
    } else {
      console.log('Gallery not found in API response');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testGalleryAPI();
