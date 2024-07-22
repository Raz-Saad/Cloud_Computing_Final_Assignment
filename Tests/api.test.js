const axios = require('axios');
const fs = require('fs');
const path = require('path');

const baseURL = 'https://ybr1iagk0m.execute-api.us-east-1.amazonaws.com/prod/'; // need to be updated each deploy

describe('Registration API', () => {
  it('should register a new user successfully', async () => {
    const username = 'testuser';
    const email = 'testuser@example.com';
    const password = 'password123';
    const fullname = 'Test User';

    const response = await axios.post(`${baseURL}registration?username=${username}&email=${email}&password=${password}&fullname=${fullname}`);
    expect(response.status).toBe(201);
    expect(response.data.message).toBe('User created successfully');
  });

  it('should handle missing parameters', async () => {
    const email = 'testuser@example.com';
    const password = 'password123';
    const fullname = 'Test User';

    try {
      const response = await axios.post(`${baseURL}registration?email=${email}&password=${password}&fullname=${fullname}`);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toBe('Missing required parameters');
    }
  });

  it('should handle invalid parameters - extra parameter', async () => {
    const username = 'testuser';
    const email = 'testuser@example.com';
    const password = 'password123';
    const fullname = 'Test User';
    const extra = 'extra';

    try {
      const response = await axios.post(`${baseURL}registration?username=${username}&email=${email}&password=${password}&fullname=${fullname}&extra=${extra}`);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toBe('Invalid parameters provided');
    }
  });
});

describe('GetUser API', () => {
    it('should retrieve user details successfully', async () => {
        const username = 'testuser';
        const email = 'testuser@example.com';
        const fullname = 'Test User';

        const response = await axios.get(`${baseURL}getUser?username=${username}`);
        expect(response.status).toBe(200);
        expect(response.data.username).toBe(username);
        expect(response.data.email).toBe(email);
        expect(response.data.fullname).toBe(fullname);
      });

  it('should handle missing username parameter', async () => {
    try {
      const response = await axios.get(`${baseURL}getUser`);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toBe('Missing username parameter');
    }
  });

  it('should return user not found for non-existent username', async () => {
    const username = 'nonexistentuser';

    try {
      const response = await axios.get(`${baseURL}getUser?username=${username}`);
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data.message).toBe(`User not found`);
    }
  });
});


describe('getPresignUrlForUplodingProfileImage API', () => {
  it('should get a PUT presign URL and upload an image', async () => {
    const username = 'testuser'; 

    try {
      const response = await axios.get(`${baseURL}getPresignUrlForUplodingProfileImage?username=${username}`);
      expect(response.status).toBe(200);
      
      const uploadUrl = response.data.uploadUrl;
      console.log('Pre-signed URL:', uploadUrl);

      const picturePath = path.resolve(__dirname, './test_image.jpg');
      const pictureContent = fs.readFileSync(picturePath);
      //console.log('picturePath', picturePath);

      //Upload the file using the pre-signed URL
      const putResponse = await axios.put(uploadUrl, pictureContent, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Length': pictureContent.length,
        },
      });

      expect(putResponse.status).toBe(200);
     
    } catch (error) {
      console.error('Error uploading profile picture:', error.response ? error.response.data : error.message);
      throw error;
    }
  });

  it('should handle missing username parameter', async () => {
    try {
      const response = await axios.get(`${baseURL}getPresignUrlForUplodingProfileImage`);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toBe('Missing username parameter');
    }
  });

  it('should return user not found for non-existent username', async () => {
    const username = 'nonexistentuser';

    try {
      const response = await axios.get(`${baseURL}getPresignUrlForUplodingProfileImage?username=${username}`);
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data.message).toBe(`User '${username}' not found`);
    }
  });
});


describe('DeleteUser API', () => {
  it('should delete user successfully', async () => {
    const username = 'testuser';

    try {
      const response = await axios.delete(`${baseURL}deleteUser?username=${username}`);
      expect(response.status).toBe(200);
      expect(response.data.message).toBe(`User '${username}' deleted successfully`);
    } catch (error) {
      console.error('DeleteUser error:', error.response.data);
      throw error;
    }
  });

  it('should handle missing username parameter', async () => {
    try {
      const response = await axios.delete(`${baseURL}deleteUser`);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toBe('Missing username parameter');
    }
  });

  it('should return user not found for non-existent username', async () => {
    const username = 'nonexistentuser';

    try {
      const response = await axios.delete(`${baseURL}deleteUser?username=${username}`);
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data.message).toBe(`User '${username}' not found`);
    }
  });
});



