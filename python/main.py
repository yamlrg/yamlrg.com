import re
import os
from datetime import datetime
from collections import defaultdict, Counter
import emoji
import openai
from typing import Dict, List
import json

# Add these to the imports at the top
from typing import Tuple
import string

class WhatsAppAnalyzer:
    def __init__(self, chat_file_path: str, openai_api_key: str):
        self.chat_file_path = chat_file_path
        openai.api_key = openai_api_key
        self.messages = []
        self.user_messages: Dict[str, List[str]] = defaultdict(list)
        self.user_stats = defaultdict(lambda: {
            'message_count': 0,
            'emoji_count': 0,
            'avg_message_length': 0,
            'active_hours': defaultdict(int),
            'messages': []
        })
        self.daily_message_counts = defaultdict(int)
        self.word_counts = Counter()
        
        # Add name mapping dictionary
        self.name_mapping = {
            '~ callum': 'Callum 🇿🇦',
            'Callum': 'Callum 🇿🇦',
            # Add more mappings if needed
        }

    def _normalize_name(self, name: str) -> str:
        """Normalize user names to handle different variations."""
        # Remove '~ ' prefix if it exists
        name = name.replace('~ ', '')
        
        # Look up the normalized name in the mapping
        base_name = name.split(' ')[0]  # Get first part of name
        return self.name_mapping.get(base_name, name)

    def parse_chat(self):
        with open(self.chat_file_path, 'r', encoding='utf-8') as file:
            for line in file:
                match = re.match(r'\[(.*?)\] (.*?): (.*)', line.strip())
                if match:
                    timestamp_str, sender, message = match.groups()
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%d/%m/%Y, %H:%M:%S')
                        
                        # Normalize the sender name
                        normalized_sender = self._normalize_name(sender)
                        
                        self.messages.append({
                            'timestamp': timestamp,
                            'sender': normalized_sender,
                            'message': message
                        })
                        self.user_messages[normalized_sender].append(message)
                        
                        # Update user stats with normalized name
                        self.user_stats[normalized_sender]['message_count'] += 1
                        self.user_stats[normalized_sender]['emoji_count'] += len([c for c in message if c in emoji.EMOJI_DATA])
                        self.user_stats[normalized_sender]['active_hours'][timestamp.hour] += 1
                        self.user_stats[normalized_sender]['messages'].append(message)

                        # Update daily message counts
                        date_key = timestamp.strftime('%Y-%m-%d')
                        self.daily_message_counts[date_key] += 1

                        # Update word counts
                        words = self._clean_and_tokenize(message)
                        self.word_counts.update(words)

                    except ValueError:
                        continue

    def _clean_and_tokenize(self, text: str) -> List[str]:
        """Clean and tokenize text for word counting."""
        # Remove punctuation and convert to lowercase
        text = text.translate(str.maketrans('', '', string.punctuation)).lower()
        # Split into words and filter out short words and numbers
        words = [word for word in text.split() 
                if len(word) > 3  # Filter out short words
                and not word.isdigit()  # Filter out numbers
                and not word.startswith('http')  # Filter out URLs
                and word not in {'para', 'como', 'that', 'this', 'with', 'what', 'from', 'have', 'your', 'about', 'would', 'it’s', 'like', 'join', 'will', 'using', 'just', 'more', 'link'}]  # Common words to filter
        return words

    def get_top_stats(self) -> Dict:
        """Get various top statistics from the chat."""
        # Top 5 Most Active Members
        top_active_members = sorted(
            [(user.replace('~ ', ''), stats['message_count']) 
             for user, stats in self.user_stats.items()],
            key=lambda x: x[1],
            reverse=True
        )[:5]

        # Top 5 Busiest Days
        top_busy_days = sorted(
            self.daily_message_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]

        # Top 5 Most Used Words
        top_words = self.word_counts.most_common(5)

        # Top 5 Emoji Users
        top_emoji_users = sorted(
            [(user.replace('~ ', ''), stats['emoji_count']) 
             for user, stats in self.user_stats.items()],
            key=lambda x: x[1],
            reverse=True
        )[:5]

        # Most Active Hours (across all users)
        hour_activity = defaultdict(int)
        for user_stats in self.user_stats.values():
            for hour, count in user_stats['active_hours'].items():
                hour_activity[hour] += count
        top_hours = sorted(
            hour_activity.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]

        return {
            'top_active_members': top_active_members,
            'top_busy_days': top_busy_days,
            'top_words': top_words,
            'top_emoji_users': top_emoji_users,
            'top_active_hours': top_hours
        }

    def save_to_json(self, output_file: str = 'whatsapp_wrapped.json'):
        """Save the analysis results to a JSON file."""
        output_data = {
            'total_messages': len(self.messages),
            'total_participants': len(self.user_stats),
            'user_stats': {},
            'top_stats': self.get_top_stats()
        }

        # Convert defaultdict to regular dict for JSON serialization
        for user, stats in self.user_stats.items():
            # Normalize the user name in the final output
            normalized_user = user.replace('~ ', '')
            output_data['user_stats'][normalized_user] = {
                'message_count': stats['message_count'],
                'emoji_count': stats['emoji_count'],
                'active_hours': dict(stats['active_hours']),
            }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        return output_file

    def generate_wrapped(self):
        print("🎉 WhatsApp Group Wrapped 2023! 🎉")
        print("\n=== Overall Stats ===")
        print(f"Total Messages: {len(self.messages)}")
        print(f"Active Participants: {len(self.user_stats)}")

        top_stats = self.get_top_stats()

        print("\n=== Top 5 Most Active Members ===")
        for user, count in top_stats['top_active_members']:
            print(f"👤 {user}: {count} messages")

        print("\n=== Top 5 Busiest Days ===")
        for date, count in top_stats['top_busy_days']:
            print(f"📅 {date}: {count} messages")

        print("\n=== Top 5 Most Used Words ===")
        for word, count in top_stats['top_words']:
            print(f"📝 {word}: {count} times")

        print("\n=== Top 5 Emoji Users ===")
        for user, count in top_stats['top_emoji_users']:
            print(f"😊 {user}: {count} emojis")

        print("\n=== Top 5 Most Active Hours ===")
        for hour, count in top_stats['top_active_hours']:
            print(f"🕐 {hour}:00: {count} messages")

def main():
    analyzer = WhatsAppAnalyzer(
        chat_file_path='_chat.txt',
        openai_api_key=os.getenv('OPENAI_API_KEY')
    )
    
    analyzer.parse_chat()
    analyzer.generate_wrapped()
    
    # Save the results to JSON
    output_file = analyzer.save_to_json()
    print(f"\nAnalysis results saved to {output_file}")

if __name__ == "__main__":
    main()
