import numpy as np
import matplotlib.pyplot as plt
from PIL import Image

# 1. Load and process the signal image
def extract_signal_coordinates(img_path):
    img = Image.open(img_path).convert('RGB')
    data = np.array(img)
    
    # Isolate the Green channel (where the signal resides)
    green = data[:,:,1]
    
    # Thresholding: 3964.14 might imply a radius-based filter, 
    # but for now we take the highest intensity peaks.
    threshold = 120
    y, x = np.where(green > threshold)
    
    return x, y

# 2. Visualize the decoded spatial map
x_coords, y_coords = extract_signal_coordinates('424321.png')

plt.figure(figsize=(8, 10), facecolor='black')
plt.scatter(x_coords, -y_coords, s=2, color='#00FF41', marker='s', alpha=0.8)
plt.title("Astro-Linguistics Event #11726: Reconstructed Spatial Array", color='white')
plt.axis('off')
plt.show()