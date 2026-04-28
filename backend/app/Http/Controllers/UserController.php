<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Display all users
     */
    public function index()
    {
        $users = User::select('id', 'name', 'email', 'role', 'created_at')->get();
        return response()->json($users);
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6|confirmed',
            'role' => 'required|in:admin,user',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->only(['id', 'name', 'email', 'role']),
        ], 201);
    }

    /**
     * Display the specified user
     */
    public function show(User $user)
    {
        return response()->json($user->only(['id', 'name', 'email', 'role', 'created_at']));
    }

    /**
     * Update the specified user
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|required|min:6|confirmed',
            'role' => 'sometimes|required|in:admin,user',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->only(['id', 'name', 'email', 'role']),
        ]);
    }

    /**
     * Delete the specified user
     */
    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete yourself'], 400);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
