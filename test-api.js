#!/usr/bin/env node
/**
 * OBIX TodoApp - API Integration Test
 * Tests all major endpoints of the full-stack application
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

let testsPassed = 0;
let testsFailed = 0;

function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function test(name, method, path, body = null, expectedStatus = 200) {
    try {
        const result = await makeRequest(method, path, body);
        if (result.status === expectedStatus) {
            console.log(`✓ ${name}`);
            testsPassed++;
            return result.body;
        } else {
            console.log(`✗ ${name} - Expected ${expectedStatus}, got ${result.status}`);
            testsFailed++;
            return null;
        }
    } catch (err) {
        console.log(`✗ ${name} - ${err.message}`);
        testsFailed++;
        return null;
    }
}

async function runTests() {
    console.log('🧪 OBIX TodoApp - API Integration Tests\n');

    // Test health endpoint
    console.log('--- Health Checks ---');
    const health = await test('Health check', 'GET', '/health');

    // Test teams endpoint
    console.log('\n--- Teams API ---');

    // Create a team
    const teamData = {
        name: 'Engineering',
        description: 'Engineering team',
        lead: 'Alice',
    };
    const createdTeam = await test('Create team', 'POST', `${API_URL}/teams`, teamData, 201);
    const teamId = createdTeam?.data?.id || createdTeam?.id;

    // List teams
    await test('List teams', 'GET', `${API_URL}/teams`, null, 200);

    // Get team details
    if (teamId) {
        await test('Get team details', 'GET', `${API_URL}/teams/${teamId}`, null, 200);
    }

    // Test tasks endpoint
    console.log('\n--- Tasks API ---');
    if (teamId) {
        // Create a task
        const taskData = {
            title: 'Fix login bug',
            description: 'Users cannot login on mobile',
            teamId: teamId,
            assignedTo: ['Bob', 'Charlie'],
            priority: 'high',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
        const createdTask = await test('Create task', 'POST', `${API_URL}/tasks`, taskData, 201);
        const taskId = createdTask?.data?.id || createdTask?.id;

        // Get task details
        if (taskId) {
            await test('Get task details', 'GET', `${API_URL}/tasks/${taskId}`, null, 200);

            // Update task
            const updateData = { status: 'in_progress' };
            await test('Update task', 'PATCH', `${API_URL}/tasks/${taskId}`, updateData, 200);

            // Mark task complete
            await test('Mark task complete', 'POST', `${API_URL}/tasks/${taskId}/complete`, {}, 200);
        }

        // List team tasks
        await test('List team tasks', 'GET', `${API_URL}/teams/${teamId}/tasks`, null, 200);
    }

    // Test compliance endpoint
    console.log('\n--- Compliance API ---');
    if (teamId) {
        // Check violations
        await test('Check violations', 'GET', `${API_URL}/compliance/violations`, null, 200);

        // Check escalations
        await test('Check escalations', 'GET', `${API_URL}/compliance/escalations`, null, 200);

        // Get team report
        await test('Get engagement report', 'GET', `${API_URL}/compliance/report/${teamId}`, null, 200);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsFailed}`);
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log('='.repeat(50));

    process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
