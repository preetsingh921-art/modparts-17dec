import api from './config';

// Get all users
export const getUsers = async () => {
  try {
    console.log('👥 Fetching all users...');
    const response = await api.get('/admin/users');
    console.log('✅ Get users response:', response.data);

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch users');
    }
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
};

// Get a single user by ID
export const getUserById = async (userId) => {
  try {
    console.log('👤 Fetching user by ID:', userId);
    const response = await api.get(`/admin/users?id=${userId}`);
    console.log('✅ Get user by ID response:', response.data);

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch user');
    }
  } catch (error) {
    console.error(`❌ Error fetching user with ID ${userId}:`, error);
    throw error;
  }
};

// Create a new user
export const createUser = async (userData) => {
  try {
    console.log('➕ Creating new user:', userData);
    const response = await api.post('/admin/users', userData);
    console.log('✅ Create user response:', response.data);

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to create user');
    }
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
};

// Update an existing user
export const updateUser = async (userData) => {
  try {
    console.log('🔄 Updating user:', userData);
    const response = await api.put('/admin/users', userData);
    console.log('✅ Update user response:', response.data);

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to update user');
    }
  } catch (error) {
    console.error(`❌ Error updating user with ID ${userData.id}:`, error);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId) => {
  try {
    console.log('🗑️ Deleting user with ID:', userId);
    const response = await api.delete(`/admin/users?id=${userId}`);
    console.log('✅ Delete user response:', response.data);

    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.message || 'Failed to delete user');
    }
  } catch (error) {
    console.error(`❌ Error deleting user with ID ${userId}:`, error);
    throw error;
  }
};
