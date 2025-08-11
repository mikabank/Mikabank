import requests
import sys
from datetime import datetime

class MikaBankAPITester:
    def __init__(self, base_url="https://87e63ea2-a138-4218-9e4f-c991a9047ca0.preview.emergentagent.com"):
        self.base_url = base_url
        self.token_joao = None
        self.token_maria = None
        self.user_joao = None
        self.user_maria = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "/",
            200
        )
        return success

    def test_register_joao(self):
        """Register João Silva"""
        success, response = self.run_test(
            "Register João Silva",
            "POST",
            "/api/register",
            200,
            data={
                "name": "João Silva",
                "email": "joao@teste.com",
                "cpf": "12345678901",
                "password": "123456"
            }
        )
        if success and 'access_token' in response:
            self.token_joao = response['access_token']
            self.user_joao = response['user']
            print(f"   João registered with balance: R${self.user_joao['balance']}")
            return True
        return False

    def test_register_maria(self):
        """Register Maria Santos"""
        success, response = self.run_test(
            "Register Maria Santos",
            "POST",
            "/api/register",
            200,
            data={
                "name": "Maria Santos",
                "email": "maria@teste.com",
                "cpf": "98765432100",
                "password": "123456"
            }
        )
        if success and 'access_token' in response:
            self.token_maria = response['access_token']
            self.user_maria = response['user']
            print(f"   Maria registered with balance: R${self.user_maria['balance']}")
            return True
        return False

    def test_login_joao(self):
        """Test login for João"""
        success, response = self.run_test(
            "Login João",
            "POST",
            "/api/login",
            200,
            data={
                "email_or_cpf": "joao@teste.com",
                "password": "123456"
            }
        )
        if success and 'access_token' in response:
            self.token_joao = response['access_token']
            return True
        return False

    def test_login_maria(self):
        """Test login for Maria"""
        success, response = self.run_test(
            "Login Maria",
            "POST",
            "/api/login",
            200,
            data={
                "email_or_cpf": "maria@teste.com",
                "password": "123456"
            }
        )
        if success and 'access_token' in response:
            self.token_maria = response['access_token']
            return True
        return False

    def test_get_profile_joao(self):
        """Get João's profile"""
        success, response = self.run_test(
            "Get João Profile",
            "GET",
            "/api/profile",
            200,
            token=self.token_joao
        )
        if success:
            print(f"   João balance: R${response.get('balance', 0)}")
            self.user_joao = response
        return success

    def test_get_profile_maria(self):
        """Get Maria's profile"""
        success, response = self.run_test(
            "Get Maria Profile",
            "GET",
            "/api/profile",
            200,
            token=self.token_maria
        )
        if success:
            print(f"   Maria balance: R${response.get('balance', 0)}")
            self.user_maria = response
        return success

    def test_transfer_joao_to_maria(self):
        """Transfer R$5 from João to Maria"""
        success, response = self.run_test(
            "Transfer R$5 João → Maria",
            "POST",
            "/api/transfer",
            200,
            data={
                "recipient_identifier": "maria@teste.com",
                "amount": 5.0,
                "description": "Teste de transferência"
            },
            token=self.token_joao
        )
        if success:
            print(f"   New balance: R${response.get('new_balance', 0)}")
            print(f"   Recipient: {response.get('recipient_name', 'Unknown')}")
        return success

    def test_get_transactions_joao(self):
        """Get João's transactions"""
        success, response = self.run_test(
            "Get João Transactions",
            "GET",
            "/api/transactions",
            200,
            token=self.token_joao
        )
        if success:
            transactions = response.get('transactions', [])
            print(f"   João has {len(transactions)} transactions")
        return success

    def test_get_transactions_maria(self):
        """Get Maria's transactions"""
        success, response = self.run_test(
            "Get Maria Transactions",
            "GET",
            "/api/transactions",
            200,
            token=self.token_maria
        )
        if success:
            transactions = response.get('transactions', [])
            print(f"   Maria has {len(transactions)} transactions")
        return success

    def test_invalid_transfer_insufficient_funds(self):
        """Test transfer with insufficient funds"""
        success, response = self.run_test(
            "Transfer Insufficient Funds",
            "POST",
            "/api/transfer",
            400,  # Should fail with 400
            data={
                "recipient_identifier": "maria@teste.com",
                "amount": 1000.0,  # More than available balance
                "description": "Should fail"
            },
            token=self.token_joao
        )
        return success

    def test_invalid_transfer_nonexistent_user(self):
        """Test transfer to nonexistent user"""
        success, response = self.run_test(
            "Transfer to Nonexistent User",
            "POST",
            "/api/transfer",
            404,  # Should fail with 404
            data={
                "recipient_identifier": "nonexistent@teste.com",
                "amount": 1.0,
                "description": "Should fail"
            },
            token=self.token_joao
        )
        return success

    def test_invalid_transfer_negative_amount(self):
        """Test transfer with negative amount"""
        success, response = self.run_test(
            "Transfer Negative Amount",
            "POST",
            "/api/transfer",
            400,  # Should fail with 400
            data={
                "recipient_identifier": "maria@teste.com",
                "amount": -5.0,
                "description": "Should fail"
            },
            token=self.token_joao
        )
        return success

    def test_user_search(self):
        """Test user search functionality"""
        success, response = self.run_test(
            "Search Users",
            "GET",
            "/api/users/search?q=maria",
            200,
            token=self.token_joao
        )
        if success:
            users = response.get('users', [])
            print(f"   Found {len(users)} users matching 'maria'")
        return success

def main():
    print("🏦 MikaBank API Testing Suite")
    print("=" * 50)
    
    tester = MikaBankAPITester()
    
    # Test sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_register_joao,
        tester.test_register_maria,
        tester.test_login_joao,
        tester.test_login_maria,
        tester.test_get_profile_joao,
        tester.test_get_profile_maria,
        tester.test_transfer_joao_to_maria,
        tester.test_get_profile_joao,  # Check updated balance
        tester.test_get_profile_maria,  # Check updated balance
        tester.test_get_transactions_joao,
        tester.test_get_transactions_maria,
        tester.test_invalid_transfer_insufficient_funds,
        tester.test_invalid_transfer_nonexistent_user,
        tester.test_invalid_transfer_negative_amount,
        tester.test_user_search
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            tester.tests_run += 1
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())