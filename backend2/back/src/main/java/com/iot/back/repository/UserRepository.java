package com.iot.back.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iot.back.entity.User;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByUsername(String username);
}
