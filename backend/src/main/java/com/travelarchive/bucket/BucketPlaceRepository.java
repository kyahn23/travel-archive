package com.travelarchive.bucket;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BucketPlaceRepository extends JpaRepository<BucketPlace, Long> {
    List<BucketPlace> findAllByUserIdOrderByPriorityAscIdDesc(Long userId);

    Optional<BucketPlace> findByIdAndUserId(Long id, Long userId);
}
