import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import './route-list.scss';
import RouteElement from './RouteElement';
import Footer from '../Footer';
import { getRoutes } from '../../selectors';
import { getRouteDistance, makeDistanceReadable } from '../../utils/distance';

class RouteList extends Component {
  shouldComponentUpdate({ routes }) {
    return routes !== null;
  }

  render() {
    const { routes, isMobile, distanceUnit } = this.props;
    const validRoutes = routes.filter(route => route.length > 1);
    const allRoutesTotal =
      validRoutes.length > 1
        ? validRoutes.reduce((acc, route) => acc + getRouteDistance(route), 0)
        : null;

    return (
      <div id="route-list-wrapper">
        {isMobile && routes.length === 0 ? (
          <div className="empty-message">Enter at least one route to see more information.</div>
        ) : (
          <ul id="route-list">
            {routes.map((route, i) => {
              return route.length > 1 ? (
                <RouteElement key={route.id} route={route} index={i} />
              ) : null;
            })}
            {allRoutesTotal !== null ? (
              <li className="all-routes-total">
                <span>All routes total:</span>
                <span className="float-right bold">
                  {makeDistanceReadable(allRoutesTotal, distanceUnit)}
                </span>
              </li>
            ) : null}
          </ul>
        )}
        <Footer />
      </div>
    );
  }
}

RouteList.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.array),
  isMobile: PropTypes.bool.isRequired,
  distanceUnit: PropTypes.string.isRequired
};
RouteList.defaultProps = { routes: null };
function mapStateToProps(state) {
  const { routes } = getRoutes(state);
  return {
    routes,
    isMobile: state.isMobile,
    distanceUnit: state.router.query.unit || 'km'
  };
}

export default connect(mapStateToProps)(RouteList);
