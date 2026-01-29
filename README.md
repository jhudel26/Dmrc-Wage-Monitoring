# Philippine Regional Minimum Wage Rates

A modern, responsive web application that displays the latest minimum wage rates across all regions in the Philippines, based on NWPC-DOLE wage orders.

## Features

- **Comprehensive Wage Data**: View minimum wage rates for all Philippine regions
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Interactive Charts**: Visual comparison of wage rates across regions
- **Search & Filter**: Easily find specific regions or wage information
- **Data-Driven**: All wage data is stored in a single JSON file for easy updates
- **No Backend Required**: Static site that can be hosted anywhere

## Data Source

Wage data is sourced from the National Wages and Productivity Commission (NWPC) and Department of Labor and Employment (DOLE) wage orders.

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- (Optional) Local web server for development

### Installation

1. Clone or download this repository
2. Open `index.html` in your web browser

### For Development

To run a local development server (recommended):

1. Install Node.js (if not already installed)
2. Install `http-server` globally:
   ```
   npm install -g http-server
   ```
3. Navigate to the project directory and run:
   ```
   http-server -p 8080
   ```
4. Open `http://localhost:8080` in your browser

## Updating Wage Data

1. Edit the `data/wages.json` file
2. Update the `lastUpdated` field with the current date (YYYY-MM-DD format)
3. Add or modify region data as needed
4. The application will automatically reflect the changes when refreshed

## Project Structure

```
ph-wage-rates/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Custom styles
├── js/
│   ├── app.js         # Main application logic
│   └── charts.js      # Chart initialization and management
├── data/
│   └── wages.json     # Wage data (editable)
└── assets/            # Images, icons, etc.
```

## Technologies Used

- HTML5, CSS3, JavaScript (ES6+)
- [Bootstrap 5](https://getbootstrap.com/) - Responsive design framework
- [Chart.js](https://www.chartjs.org/) - Interactive charts
- [Bootstrap Icons](https://icons.getbootstrap.com/) - Icon set

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 12+)
- Chrome for Android

## License

This project is open source and available under the [MIT License](LICENSE).

## Disclaimer

This application is for informational purposes only. While we strive to keep the information up to date and correct, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability with respect to the application or the information contained within it. Always refer to the official NWPC-DOLE website for the most current and accurate wage information.
