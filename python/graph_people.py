import re
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime, timedelta
from scipy.optimize import curve_fit
import matplotlib.dates as mdates

# Function to parse the WhatsApp chat file and extract member join dates
def parse_chat_file(file_path):
    # Updated pattern to catch more join variations
    join_pattern = r"\[(?P<date>\d{1,2}/\d{1,2}/\d{4}), \d{2}:\d{2}:\d{2}\] (?P<name>.+?): (?:‎.+ joined using this group's invite link|‎You joined using this group's invite link|‎.+ was added|‎.+ added .+)"
    join_dates = []

    with open(file_path, 'r', encoding='utf-8') as file:
        for line in file:
            match = re.search(join_pattern, line)
            if match:
                date_str = match.group('date')
                join_date = datetime.strptime(date_str, '%d/%m/%Y')
                if join_date <= datetime(2025, 9, 1):  # Only include dates until Sept 2025
                    join_dates.append(join_date)

    return sorted(join_dates)

# Function to calculate cumulative members over time
def calculate_cumulative_members(join_dates):
    cumulative_counts = []
    unique_dates = sorted(set(join_dates))

    for date in unique_dates:
        cumulative_counts.append(sum(1 for d in join_dates if d <= date))

    return unique_dates, cumulative_counts

# Function to predict future growth using a linear model
def predict_growth(unique_dates, cumulative_counts, months_ahead=6):
    # Convert dates to numerical values
    days_since_start = [(date - unique_dates[0]).days for date in unique_dates]
    
    # Use only the last 3 months of data for prediction to capture recent trend
    last_90_days = 90
    if len(days_since_start) > last_90_days:
        days_since_start = days_since_start[-last_90_days:]
        cumulative_counts = cumulative_counts[-last_90_days:]
    
    # Fit exponential growth: y = a * exp(b * x) + c
    def exp_func(x, a, b, c):
        return a * np.exp(b * x) + c
    
    try:
        popt, _ = curve_fit(exp_func, days_since_start, cumulative_counts, 
                          p0=[1, 0.01, min(cumulative_counts)],
                          maxfev=2000)
    except RuntimeError:
        # Fallback to linear if exponential fitting fails
        coeffs = np.polyfit(days_since_start, cumulative_counts, 1)
        a, b = coeffs
        popt = [a, 0, b]
    
    # Generate future dates
    future_dates = [unique_dates[-1] + timedelta(days=30*i) for i in range(1, months_ahead + 1)]
    future_days = [(date - unique_dates[0]).days for date in future_dates]
    
    # Calculate predicted values
    if len(popt) == 3:
        future_counts = [exp_func(d, *popt) for d in future_days]
    else:
        future_counts = [popt[0] * d + popt[1] for d in future_days]
    
    return future_dates, future_counts

# Function to plot the graph
def plot_graph(unique_dates, cumulative_counts, future_dates, future_counts):
    plt.figure(figsize=(12, 6))
    
    # Use pastel colors but make event markers darker
    main_color = '#7CB9E8'  # Pastel blue
    prediction_color = '#F4C430'  # Pastel yellow
    event_color = '#FF9994'  # Darker pink for better visibility
    
    # Plot historical data
    plt.plot(unique_dates, cumulative_counts, label='Cumulative Members', 
             color=main_color, marker='o', linewidth=2)
    
    # Plot predicted growth
    plt.plot(future_dates, future_counts, label='Predicted Growth', 
             linestyle='--', color=prediction_color, linewidth=2)
    
    # Add event markers with darker lines and rotated text
    events = [
        (datetime(2023, 2, 20), "First Presentation"),
        (datetime(2024, 6, 10), "Maria's Revival"),
        (datetime(2024, 10, 1), "EF Cohort Expansion")
    ]
    
    for date, label in events:
        # Find the y-value at this date by interpolating
        idx = np.searchsorted(unique_dates, date)
        if idx >= len(cumulative_counts):
            y_start = cumulative_counts[-1]
        else:
            y_start = cumulative_counts[idx]
        
        # Draw line from data point up to text height only
        plt.vlines(x=date, ymin=y_start, ymax=plt.ylim()[1]*0.5, 
                  color=event_color, linestyle=':', alpha=0.8)
        
        # Place text to the right of the line
        plt.text(date, plt.ylim()[1]*0.5, '  ' + label,  # Added space before label
                rotation=10,
                verticalalignment='bottom',
                horizontalalignment='left')
    
    # Formatting
    plt.xlabel('Date')
    plt.ylabel('Cumulative Members')
    plt.title('yamlrg Membership Growth', pad=20)
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()

    # Set x-axis limit to Sept 2025
    plt.xlim(min(unique_dates), datetime(2025, 9, 1))
    
    plt.show()

def plot_membership_growth(join_dates):
    # Convert dates to numerical values for curve fitting
    dates_num = mdates.date2num(join_dates)
    y = np.arange(1, len(dates_num) + 1)
    
    # Fit an exponential curve to the data
    def exp_func(x, a, b, c):
        return a * np.exp(b * x) + c
    
    popt, _ = curve_fit(exp_func, dates_num - dates_num[0], y, p0=[1, 0.01, 1])
    
    # Generate future dates for prediction
    future_days = 365  # Predict one year ahead
    last_date = join_dates[-1]
    future_dates = [last_date + timedelta(days=x) for x in range(future_days)]
    future_dates_num = mdates.date2num(future_dates)
    
    # Calculate predicted values
    y_pred = exp_func(future_dates_num - dates_num[0], *popt)
    
    # Create the plot
    plt.figure(figsize=(12, 8))
    plt.plot(join_dates, y, 'o-', label='Cumulative Members')
    plt.plot(future_dates, y_pred, '--', label='Predicted Growth', color='orange')
    
    # Formatting the plot
    plt.xlabel('Date')
    plt.ylabel('Cumulative Members')
    plt.title('WhatsApp Group Membership Growth')
    plt.legend()
    plt.grid(True)
    plt.tight_layout()

    # Show the plot
    plt.show()

# Main execution
if __name__ == "__main__":
    # Path to the WhatsApp chat file
    file_path = '_chat_2.txt'

    # Parse the chat file
    join_dates = parse_chat_file(file_path)

    if join_dates:
        # Calculate cumulative members
        unique_dates, cumulative_counts = calculate_cumulative_members(join_dates)

        # Predict future growth
        future_dates, future_counts = predict_growth(unique_dates, cumulative_counts)

        # Plot the graph
        plot_graph(unique_dates, cumulative_counts, future_dates, future_counts)

        # Plot membership growth
        plot_membership_growth(join_dates)
    else:
        print("No member join data found in the chat file.")
