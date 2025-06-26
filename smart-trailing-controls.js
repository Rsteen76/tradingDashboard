// 🎮 Smart Trailing Dashboard Controls
// Test script to control smart trailing system remotely

const http = require('http');

// Configuration
const ML_SERVER_HOST = 'localhost';
const ML_SERVER_PORT = 8080;

// Smart Trailing Control Functions
class SmartTrailingController {
    constructor() {
        this.baseUrl = `http://${ML_SERVER_HOST}:${ML_SERVER_PORT}`;
    }

    // Enable smart trailing for all instruments
    async enableSmartTrailing(instrument = 'ALL') {
        return this.sendCommand('enable_smart_trailing', { instrument });
    }

    // Disable smart trailing for all instruments
    async disableSmartTrailing(instrument = 'ALL') {
        return this.sendCommand('disable_smart_trailing', { instrument });
    }

    // Adjust trailing confidence threshold
    async setTrailingConfidence(confidence, instrument = 'ALL') {
        if (confidence < 0.3 || confidence > 1.0) {
            throw new Error('Confidence must be between 0.3 and 1.0');
        }
        return this.sendCommand('adjust_trailing_confidence', { 
            confidence, 
            instrument 
        });
    }

    // Adjust trailing update interval
    async setTrailingInterval(intervalSeconds, instrument = 'ALL') {
        if (intervalSeconds < 5 || intervalSeconds > 120) {
            throw new Error('Interval must be between 5 and 120 seconds');
        }
        return this.sendCommand('adjust_trailing_interval', { 
            interval_seconds: intervalSeconds, 
            instrument 
        });
    }

    // Get current smart trailing status
    async getTrailingStatus() {
        try {
            const response = await this.makeRequest('/status');
            return response.smart_trailing || {};
        } catch (error) {
            console.error('Error getting trailing status:', error.message);
            return null;
        }
    }

    // Send command to ML server
    async sendCommand(command, parameters = {}) {
        try {
            const payload = {
                command,
                timestamp: new Date().toISOString(),
                ...parameters
            };

            const response = await this.makeRequest('/command', 'POST', payload);
            console.log(`✅ Command sent: ${command}`, parameters);
            return response;
        } catch (error) {
            console.error(`❌ Failed to send command: ${command}`, error.message);
            throw error;
        }
    }

    // Make HTTP request to ML server
    async makeRequest(endpoint, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: ML_SERVER_HOST,
                port: ML_SERVER_PORT,
                path: endpoint,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data) {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const req = http.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        resolve(response);
                    } catch (error) {
                        resolve({ raw: responseData });
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }
}

// Example usage functions
async function demonstrateControls() {
    const controller = new SmartTrailingController();

    console.log('🎮 Smart Trailing Control Demo');
    console.log('================================');

    try {
        // Get current status
        console.log('\n📊 Getting current trailing status...');
        const status = await controller.getTrailingStatus();
        console.log('Current status:', status);

        // Enable smart trailing
        console.log('\n🤖 Enabling smart trailing...');
        await controller.enableSmartTrailing();

        // Set confidence to 70%
        console.log('\n🎯 Setting trailing confidence to 70%...');
        await controller.setTrailingConfidence(0.7);

        // Set update interval to 20 seconds
        console.log('\n⏱️ Setting update interval to 20 seconds...');
        await controller.setTrailingInterval(20);

        console.log('\n✅ All commands sent successfully!');
        console.log('\n💡 Check your NinjaTrader strategy output for confirmation.');

    } catch (error) {
        console.error('\n❌ Demo failed:', error.message);
    }
}

// Preset configurations
const PRESETS = {
    CONSERVATIVE: {
        enabled: true,
        confidence: 0.8,
        interval: 30,
        description: 'Conservative trailing with high confidence requirement'
    },
    BALANCED: {
        enabled: true,
        confidence: 0.6,
        interval: 15,
        description: 'Balanced trailing for normal market conditions'
    },
    AGGRESSIVE: {
        enabled: true,
        confidence: 0.5,
        interval: 10,
        description: 'Aggressive trailing for volatile markets'
    },
    DISABLED: {
        enabled: false,
        description: 'Disable smart trailing completely'
    }
};

async function applyPreset(presetName) {
    const controller = new SmartTrailingController();
    const preset = PRESETS[presetName.toUpperCase()];

    if (!preset) {
        console.error('❌ Unknown preset. Available presets:', Object.keys(PRESETS));
        return;
    }

    console.log(`🎛️ Applying ${presetName.toUpperCase()} preset: ${preset.description}`);

    try {
        if (preset.enabled) {
            await controller.enableSmartTrailing();
            if (preset.confidence) {
                await controller.setTrailingConfidence(preset.confidence);
            }
            if (preset.interval) {
                await controller.setTrailingInterval(preset.interval);
            }
        } else {
            await controller.disableSmartTrailing();
        }

        console.log(`✅ ${presetName.toUpperCase()} preset applied successfully!`);
    } catch (error) {
        console.error(`❌ Failed to apply preset: ${error.message}`);
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'demo':
            demonstrateControls();
            break;
        case 'enable':
            new SmartTrailingController().enableSmartTrailing();
            break;
        case 'disable':
            new SmartTrailingController().disableSmartTrailing();
            break;
        case 'preset':
            const presetName = args[1];
            if (presetName) {
                applyPreset(presetName);
            } else {
                console.log('Available presets:', Object.keys(PRESETS));
            }
            break;
        case 'status':
            new SmartTrailingController().getTrailingStatus()
                .then(status => console.log('Trailing Status:', status));
            break;
        default:
            console.log('🎮 Smart Trailing Controller');
            console.log('Usage:');
            console.log('  node smart-trailing-controls.js demo      - Run demonstration');
            console.log('  node smart-trailing-controls.js enable    - Enable smart trailing');
            console.log('  node smart-trailing-controls.js disable   - Disable smart trailing');
            console.log('  node smart-trailing-controls.js preset <name> - Apply preset configuration');
            console.log('  node smart-trailing-controls.js status    - Get current status');
            console.log('');
            console.log('Available presets:', Object.keys(PRESETS).join(', '));
    }
}

module.exports = {
    SmartTrailingController,
    PRESETS,
    applyPreset
}; 