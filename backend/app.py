from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import json
import traceback
from threading import Thread

# Import RaSPDAM components
try:
    from raspdam import RaSPDAM
    from utils.params import SDParams
    RASPDAM_AVAILABLE = True
except ImportError:
    RASPDAM_AVAILABLE = False
    print("Warning: RaSPDAM modules not available. Install requirements.txt")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Global detector instance
detector = None
detection_results = {}

def initialize_detector():
    """Initialize RaSPDAM detector with default parameters"""
    global detector
    try:
        params = SDParams(
            model_path='models',
            output_path=tempfile.gettempdir(),
            iou_threshold=0.5,
            overlap_threshold=0.5,
            box_fill_percent_threshold=0.25,
            projection_percent_threshold=0.15,
            time_window_size=2.0
        )
        detector = RaSPDAM(params)
        return True
    except Exception as e:
        print(f"Error initializing detector: {e}")
        traceback.print_exc()
        return False

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    status = {
        'status': 'ok',
        'raspdam_available': RASPDAM_AVAILABLE,
        'detector_initialized': detector is not None
    }
    return jsonify(status), 200

@app.route('/api/detect', methods=['POST'])
def detect_signals():
    """
    Detect signals in uploaded FITS/FIL file
    
    Expected request:
    - file: FITS or FIL file
    - optional params: iou_threshold, overlap_threshold, etc.
    """
    if not RASPDAM_AVAILABLE:
        return jsonify({'error': 'RaSPDAM modules not available'}), 500
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    # Validate file extension
    valid_extensions = {'.fits', '.fil'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in valid_extensions:
        return jsonify({'error': f'Invalid file type. Expected .fits or .fil, got {file_ext}'}), 400
    
    # Save uploaded file temporarily
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name
        
        # Initialize detector if needed
        global detector
        if detector is None:
            if not initialize_detector():
                return jsonify({'error': 'Failed to initialize detector'}), 500
        
        # Run detection
        result_id = os.path.basename(tmp_path)
        detection_results[result_id] = {
            'status': 'processing',
            'filename': file.filename,
            'result': None
        }
        
        # Run detection in background thread
        def run_detection():
            try:
                detector.detect([tmp_path])
                detection_results[result_id]['status'] = 'completed'
                detection_results[result_id]['result'] = {
                    'message': 'Signal detection completed successfully',
                    'output_path': detector.params.output_path
                }
            except Exception as e:
                detection_results[result_id]['status'] = 'error'
                detection_results[result_id]['result'] = {'error': str(e)}
            finally:
                # Cleanup temporary file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        
        thread = Thread(target=run_detection, daemon=True)
        thread.start()
        
        return jsonify({
            'status': 'processing',
            'message': 'Detection started',
            'result_id': result_id,
            'file': file.filename
        }), 202
    
    except Exception as e:
        print(f"Error in detect_signals: {e}")
        traceback.print_exc()
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        return jsonify({'error': str(e)}), 500

@app.route('/api/detect/status/<result_id>', methods=['GET'])
def get_detection_status(result_id):
    """Get detection status by result ID"""
    if result_id not in detection_results:
        return jsonify({'error': 'Result not found'}), 404
    
    result = detection_results[result_id]
    return jsonify({
        'result_id': result_id,
        'status': result['status'],
        'filename': result['filename'],
        'result': result['result']
    }), 200

@app.route('/api/detect/config', methods=['POST'])
def set_detection_config():
    """Update detection configuration parameters"""
    global detector
    
    try:
        data = request.get_json()
        
        # Create new params with provided values
        params = SDParams(
            model_path=data.get('model_path', 'models'),
            output_path=data.get('output_path', tempfile.gettempdir()),
            iou_threshold=float(data.get('iou_threshold', 0.5)),
            overlap_threshold=float(data.get('overlap_threshold', 0.5)),
            box_fill_percent_threshold=float(data.get('box_fill_percent_threshold', 0.25)),
            projection_percent_threshold=float(data.get('projection_percent_threshold', 0.15)),
            time_window_size=float(data.get('time_window_size', 2.0))
        )
        
        # Reinitialize detector with new params
        detector = None
        detector = RaSPDAM(params)
        
        return jsonify({
            'status': 'success',
            'message': 'Detection configuration updated',
            'config': {
                'iou_threshold': params.iou_threshold,
                'overlap_threshold': params.overlap_threshold,
                'box_fill_percent_threshold': params.box_fill_percent_threshold,
                'projection_percent_threshold': params.projection_percent_threshold,
                'time_window_size': params.time_window_size
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Starting RaSPDAM Detection API Server...")
    print("Initializing detector...")
    if initialize_detector():
        print("Detector initialized successfully")
    else:
        print("Warning: Detector initialization failed, will attempt on first request")
    
    app.run(debug=True, port=5000, host='0.0.0.0')
