import axios from 'axios';

async function imageToBase64(url) {
    try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer'
        });
    
        const base64 = Buffer.from(response.data, 'binary').toString('base64');

        return base64;
      } catch (error) {
        throw new Error('Failed to convert image to base64: ' + error.message);
      }
      
};

export default imageToBase64;