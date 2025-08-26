const fs = require('fs').promises;

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      // Read site configuration
      let config = {
        logo: null,
        siteName: 'ModParts',
        lastUpdated: null
      };

      try {
        const configData = await fs.readFile('config/site-config.json', 'utf8');
        config = { ...config, ...JSON.parse(configData) };
      } catch {
        // Config file doesn't exist, use defaults
      }

      res.json({
        success: true,
        config: config
      });

    } catch (error) {
      console.error('Error reading site config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to read site configuration'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
};
