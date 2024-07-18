const axios = require('axios');

const baseURL = 'https://liulv40kxb.execute-api.us-east-1.amazonaws.com/prod/';

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

  it('should handle invalid parameters', async () => {
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
        const username = 'testuser'; // Assuming 'testuser' exists in your DynamoDB
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

describe('DeleteUser API', () => {
  it('should delete user successfully', async () => {
    const username = 'testuser'; // Assuming 'testuser' exists in your DynamoDB

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
