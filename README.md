# Aifacescan_node_sdk
AI Facescan ingestion and enrolldata example

# Install 

npm install

# Start

npm start

# Example Person Data

[
    {
        "sn": "AYSJ26008809",
        "enrollid": 1,
        "name": "1",
        "picture": "https://aifacescan.net/facetime/files/file-1769142465027-915104350.jpeg",
        "admin": 0,
        "password": 1234,
        "rfid": 1234,
        "status": 0
    }
]

/**
 * Example data for uploading persons to a device
 *
 * Field descriptions:
 * - sn: Target device serial number
 * - enrollid: Person enrollment ID (must be a number)
 * - name: Person name (string)
 * - picture: Base64 image string or HTTP/HTTPS image URL
 *          (URL will be converted to Base64 before uploading to the device)
 * - admin: Admin status
 *      0 = normal user
 *      1 = admin user
 * - password: Numeric password (number)
 * - rfid: RFID card number (number)
 * - status:
 *      0 = initial upload state
 */
