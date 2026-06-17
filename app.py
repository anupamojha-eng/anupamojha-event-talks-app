import urllib.request
import ssl
import xml.etree.ElementTree as ET
import re
import os
from flask import Flask, jsonify, render_template

app = Flask(__name__, template_folder='templates', static_folder='static')

# Create standard SSL context that bypasses validation (due to common local cert issues)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    req = urllib.request.Request(
        FEED_URL, 
        headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    )
    with urllib.request.urlopen(req, context=ssl_context) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    all_updates = []
    
    for entry_idx, entry in enumerate(entries):
        title = entry.find('atom:title', ns)
        date_str = title.text.strip() if title is not None else "Unknown Date"
        
        updated = entry.find('atom:updated', ns)
        updated_str = updated.text.strip() if updated is not None else ""
        
        link_elem = entry.find('atom:link', ns)
        link_href = link_elem.attrib.get('href', '') if link_elem is not None else ''
        
        content_elem = entry.find('atom:content', ns)
        content_text = content_elem.text if content_elem is not None else ""
        
        # Split by h3 headers: <h3>Category</h3>
        parts = re.split(r'<h3>(.*?)</h3>', content_text, flags=re.IGNORECASE)
        
        if len(parts) > 1:
            item_idx = 0
            for i in range(1, len(parts), 2):
                category = parts[i].strip()
                content = parts[i+1].strip() if i+1 < len(parts) else ""
                
                update_id = f"bq-{entry_idx}-{item_idx}"
                all_updates.append({
                    'id': update_id,
                    'date': date_str,
                    'updated': updated_str,
                    'link': link_href,
                    'category': category,
                    'content': content
                })
                item_idx += 1
        else:
            all_updates.append({
                'id': f"bq-{entry_idx}-single",
                'date': date_str,
                'updated': updated_str,
                'link': link_href,
                'category': 'Update',
                'content': content_text.strip()
            })
            
    return all_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    try:
        updates = fetch_and_parse_feed()
        return jsonify({
            'success': True,
            'count': len(updates),
            'updates': updates
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Running locally on port 5001 to avoid default port conflicts
    app.run(host='127.0.0.1', port=5001, debug=True)
