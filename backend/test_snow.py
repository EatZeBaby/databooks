import snowflake.connector
import os
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()
import sys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_snowflake_connection_advanced():
    """Advanced connectivity test with better error handling"""
    
    # Get credentials from environment variables
    conn_params = {
        'user': os.getenv('SNOWFLAKE_USER'),
        'password': os.getenv('SNOWFLAKE_PASSWORD'),
        'account': os.getenv('SNOWFLAKE_ACCOUNT'),
        'warehouse': os.getenv('SNOWFLAKE_WAREHOUSE'),
        'database': os.getenv('SNOWFLAKE_DATABASE'),
        'schema': os.getenv('SNOWFLAKE_SCHEMA'),
        'role': os.getenv('SNOWFLAKE_ROLE', None),  # Optional
        'login_timeout': 20  # Timeout in seconds
    }
    
    # Remove None values
    conn_params = {k: v for k, v in conn_params.items() if v is not None}
    
    # Validate required parameters
    required_params = ['user', 'password', 'account']
    missing_params = [p for p in required_params if not conn_params.get(p)]
    
    if missing_params:
        logger.error(f"Missing required parameters: {missing_params}")
        return False
    
    conn = None
    cur = None
    
    try:
        logger.info("Connecting to Snowflake...")
        conn = snowflake.connector.connect(**conn_params)
        logger.info("Connection established successfully!")
        
        cur = conn.cursor()
        
        # Run diagnostic queries
        diagnostics = {
            "Version": "SELECT CURRENT_VERSION()",
            "Current Time": "SELECT CURRENT_TIMESTAMP()",
            "Account": "SELECT CURRENT_ACCOUNT()",
            "User": "SELECT CURRENT_USER()",
            "Role": "SELECT CURRENT_ROLE()",
            "Warehouse": "SELECT CURRENT_WAREHOUSE()",
            "Database": "SELECT CURRENT_DATABASE()",
            "Schema": "SELECT CURRENT_SCHEMA()"
        }
        
        print("\n" + "="*50)
        print("SNOWFLAKE CONNECTION DIAGNOSTICS")
        print("="*50)
        
        for label, query in diagnostics.items():
            try:
                cur.execute(query)
                result = cur.fetchone()[0]
                print(f"{label:15}: {result}")
            except Exception as e:
                print(f"{label:15}: Error - {e}")
        
        # Test data access
        print("\n" + "="*50)
        print("DATA ACCESS TEST")
        print("="*50)
        
        # List databases
        cur.execute("SHOW DATABASES")
        databases = cur.fetchall()
        print(f"Accessible databases: {len(databases)}")
        
        # List warehouses
        cur.execute("SHOW WAREHOUSES")
        warehouses = cur.fetchall()
        print(f"Accessible warehouses: {len(warehouses)}")
        
        # Test query performance
        import time
        start_time = time.time()
        cur.execute("SELECT 1")
        cur.fetchone()
        query_time = time.time() - start_time
        print(f"Simple query execution time: {query_time:.3f} seconds")
        
        logger.info("All tests completed successfully!")
        return True
        
    except snowflake.connector.errors.DatabaseError as e:
        logger.error(f"Database error: {e}")
        return False
    except snowflake.connector.errors.ProgrammingError as e:
        logger.error(f"Programming error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False
    finally:
        # Clean up resources
        if cur:
            cur.close()
        if conn:
            conn.close()
            logger.info("Connection closed.")

if __name__ == "__main__":
    success = test_snowflake_connection_advanced()
    sys.exit(0 if success else 1)