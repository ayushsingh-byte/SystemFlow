from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    def on_console(msg):
        print(f"CONSOLE: {msg.type}: {msg.text}")
        
    def on_request_failed(request):
        print(f"FAILED: {request.url} - {request.failure.error_text if request.failure else 'Unknown'}")
        
    def on_response(response):
        if response.status >= 400:
            print(f"HTTP ERROR: {response.status} {response.url}")

    page.on("console", on_console)
    page.on("requestfailed", on_request_failed)
    page.on("response", on_response)
    
    try:
        page.goto("http://localhost:8080", wait_until="networkidle", timeout=10000)
    except Exception as e:
        print(f"Goto error: {e}")
        
    print("PAGE TITLE:", page.title())
    browser.close()
