package com.iot.back.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import com.iot.back.dto.ActionResponse;
import com.iot.back.entity.Action;
import com.iot.back.entity.Device;
import com.iot.back.entity.User;
import com.iot.back.repository.ActionRepository;
import com.iot.back.repository.UserRepository;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;

@Service
public class ActionService {

    private final ActionRepository actionRepository;
    private final UserRepository userRepository;

    public ActionService(
            ActionRepository actionRepository,
            UserRepository userRepository) {

        this.actionRepository = actionRepository;
        this.userRepository = userRepository;
    }

    public Page<ActionResponse> getActions(
            String user,
            String device,
            String action,
            String status,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable) {

        Specification<Action> specification =
                (root, query, cb) -> cb.conjunction();

        /*
         * =========================
         * FILTER USER
         * =========================
         *
         * Action.uid chỉ là Integer,
         * không phải quan hệ @ManyToOne với User.
         *
         * Vì vậy dùng subquery để tìm User.
         *
         * Có thể tìm theo:
         * - displayName
         * - username
         */
        if (user != null && !user.isBlank()) {

            String keyword =
                    "%" + user.trim().toLowerCase() + "%";

            specification = specification.and(
                    (root, query, cb) -> {

                        var subquery =
                                query.subquery(Integer.class);

                        var userRoot =
                                subquery.from(User.class);

                        subquery.select(
                                userRoot.get("id")
                        );

                        subquery.where(
                                cb.equal(
                                        userRoot.get("id"),
                                        root.get("uid")
                                ),
                                cb.or(
                                        cb.like(
                                                cb.lower(
                                                        userRoot.get(
                                                                "displayName"
                                                        )
                                                ),
                                                keyword
                                        ),
                                        cb.like(
                                                cb.lower(
                                                        userRoot.get(
                                                                "username"
                                                        )
                                                ),
                                                keyword
                                        )
                                )
                        );

                        return cb.exists(subquery);
                    }
            );
        }

        /*
         * =========================
         * FILTER DEVICE
         * =========================
         *
         * Tìm theo:
         * - tên thiết bị
         * - deviceNumber
         */
        if (device != null && !device.isBlank()) {

            String keyword =
                    "%" + device.trim().toLowerCase() + "%";

            specification = specification.and(
                    (root, query, cb) -> {

                        Join<Action, Device> deviceJoin =
                                root.join(
                                        "device",
                                        JoinType.LEFT
                                );

                        return cb.or(
                                cb.like(
                                        cb.lower(
                                                deviceJoin.get("name")
                                        ),
                                        keyword
                                ),
                                cb.like(
                                        cb.lower(
                                                deviceJoin
                                                        .get("deviceNumber")
                                                        .as(String.class)
                                        ),
                                        keyword
                                )
                        );
                    }
            );
        }

        /*
         * =========================
         * FILTER ACTION
         * =========================
         */
        if (action != null && !action.isBlank()) {

            specification = specification.and(
                    (root, query, cb) ->
                            cb.equal(
                                    root.get("action"),
                                    action
                            )
            );
        }

        /*
         * =========================
         * FILTER STATUS
         * =========================
         */
        if (status != null && !status.isBlank()) {

            specification = specification.and(
                    (root, query, cb) ->
                            cb.equal(
                                    root.get("status"),
                                    status
                            )
            );
        }

        /*
         * =========================
         * FILTER TIME - FROM
         * =========================
         */
        if (from != null) {

            specification = specification.and(
                    (root, query, cb) ->
                            cb.greaterThanOrEqualTo(
                                    root.get("time"),
                                    from
                            )
            );
        }

        /*
         * =========================
         * FILTER TIME - TO
         * =========================
         */
        if (to != null) {

            specification = specification.and(
                    (root, query, cb) ->
                            cb.lessThanOrEqualTo(
                                    root.get("time"),
                                    to
                            )
            );
        }

        /*
         * =========================
         * DATABASE QUERY
         * =========================
         *
         * Pageable vẫn được truyền vào đây,
         * nên pagination + sort vẫn hoạt động.
         */
        Page<Action> actions =
                actionRepository.findAll(
                        specification,
                        pageable
                );

        /*
         * =========================
         * USER NAME CACHE
         * =========================
         *
         * Tránh query User nhiều lần
         * nếu cùng một uid xuất hiện trên page.
         */
        Map<Integer, String> userNameCache =
                new HashMap<>();

        return actions.map(actionEntity -> {

            Integer uid = actionEntity.getUid();

            String userName = null;

            if (uid != null) {

                if (userNameCache.containsKey(uid)) {

                    userName =
                            userNameCache.get(uid);

                } else {

                    userName =
                            userRepository.findById(uid)
                                    .map(User::getDisplayName)
                                    .orElse(null);

                    userNameCache.put(
                            uid,
                            userName
                    );
                }
            }

            return ActionResponse.from(
                    actionEntity,
                    userName
            );
        });
    }
}